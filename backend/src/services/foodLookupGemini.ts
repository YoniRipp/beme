/**
 * Gemini-based food lookup when the food is not in the DB.
 * Returns nutrition per 100g or per 100ml (one row); inserts into foods and returns it.
 */
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { z } from 'zod';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

const FOOD_LOOKUP_PROMPT = `You are a nutrition data assistant. Given a food or drink name, return exactly one JSON object (no array, no markdown, no code fence) with nutrition per 100g for solid foods or per 100ml for liquids.

Response shape (use these exact keys):
{
  "name": "Official or common name in English",
  "calories": number (kcal per 100g or 100ml),
  "protein": number (g),
  "carbs": number (g),
  "fat": number (g),
  "is_liquid": boolean (true for drinks: soda, juice, coffee, milk, etc.),
  "serving_sizes_ml": { "can": number, "bottle": number, "glass": number } in ml, only for liquids; omit or null for solids
}

Rules:
- One object only. No array, no extra text.
- Include "cooked" or "uncooked" in the name when relevant. Use the word "uncooked" only (not "raw") for consistency. Default to cooked: e.g. "chicken breast" or "rice" → "Chicken breast, cooked" or "Rice, cooked". Only if the user says "uncooked" or "raw" use ", uncooked" (e.g. "Rice, uncooked"). For drinks, no need to add.
- For drinks (soda, juice, coffee, tea, milk, etc.) set is_liquid true and provide per 100ml values; include serving_sizes_ml with typical can (e.g. 330), bottle (e.g. 500), glass (e.g. 250).
- For solid foods set is_liquid false; serving_sizes_ml can be null or omitted.
- Use realistic values. If unsure, use reasonable estimates.`;

const GeminiFoodSchema = z.object({
  name: z.string().min(1).transform((s) => s.trim()),
  calories: z.number().min(0).max(1000),
  protein: z.number().min(0).max(100),
  carbs: z.number().min(0).max(100),
  fat: z.number().min(0).max(100),
  is_liquid: z.boolean(),
  serving_sizes_ml: z
    .object({
      can: z.number().min(0).max(2000).optional(),
      bottle: z.number().min(0).max(5000).optional(),
      glass: z.number().min(0).max(1000).optional(),
    })
    .nullable()
    .optional(),
});

function extractJson(text: unknown) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const first = stripped.match(/\{[\s\S]*\}/);
    if (first) {
      try {
        return JSON.parse(first[0]);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Check if a similar-named food already exists to avoid duplicates.
 */
async function findExistingByName(pool: { query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }, name: string) {
  const normalized = name.toLowerCase().trim().replace(/\s+/g, ' ');
  const result = await pool.query(
    `SELECT id, name, calories, protein, carbs, fat, is_liquid, serving_sizes_ml
     FROM foods
     WHERE lower(trim(regexp_replace(name, '\\s+', ' ', 'g'))) = $1
     LIMIT 1`,
    [normalized]
  );
  return result.rows[0] || null;
}

/**
 * Look up a food by name via Gemini, optionally insert into foods, and return the row (per 100g or 100ml).
 * @param {import('pg').Pool} pool
 * @param {string} foodName
 * @param {{ liquidHint?: boolean }} [options]
 * @returns {Promise<{ id: string, name: string, calories: number, protein: number, carbs: number, fat: number, is_liquid: boolean, serving_sizes_ml: object | null } | null>}
 */
export async function lookupAndCreateFood(pool: { query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }, foodName: string, options: { liquidHint?: boolean } = {}) {
  const name = typeof foodName === 'string' ? foodName.trim() : '';
  if (!name) return null;
  if (!config.geminiApiKey) return null;

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];
  const model = genAI.getGenerativeModel({ model: config.geminiModel, safetySettings });
  const prompt = `${FOOD_LOOKUP_PROMPT}\n\nFood or drink name: ${name}`;

  let text;
  try {
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const response = result.response;
    if (!response || !response.text) return null;
    text = response.text();
  } catch (e: unknown) {
    logger.error({ err: e }, 'foodLookupGemini generateContent');
    return null;
  }

  const raw = extractJson(text);
  if (!raw) return null;

  const parsed = GeminiFoodSchema.safeParse(raw);
  if (!parsed.success) return null;
  const data = parsed.data;

  const nameForDb = String(data.name || '').replace(/\braw\b/gi, 'uncooked');
  const preparation = /\b(uncooked|raw)\b/i.test(data.name || '') ? 'uncooked' : 'cooked';

  const existing = await findExistingByName(pool, nameForDb);
  if (existing) {
    const displayName = String(existing.name || '').replace(/\braw\b/gi, 'uncooked');
    return {
      id: existing.id,
      name: displayName,
      calories: Number(existing.calories),
      protein: Number(existing.protein),
      carbs: Number(existing.carbs),
      fat: Number(existing.fat),
      is_liquid: Boolean(existing.is_liquid),
      serving_sizes_ml: existing.serving_sizes_ml ?? null,
    };
  }

  const servingSizesMl = data.is_liquid && data.serving_sizes_ml
    ? JSON.stringify(data.serving_sizes_ml)
    : null;

  const insertResult = await pool.query(
    `INSERT INTO foods (name, common_name, calories, protein, carbs, fat, is_liquid, serving_sizes_ml, preparation)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
     RETURNING id, name, common_name, calories, protein, carbs, fat, is_liquid, serving_sizes_ml`,
    [
      nameForDb,
      nameForDb,  // common_name = name for Gemini foods (already clean)
      data.calories,
      data.protein,
      data.carbs,
      data.fat,
      data.is_liquid,
      servingSizesMl,
      preparation,
    ]
  );
  const row = insertResult.rows[0];
  const displayName = String(row.name || '').replace(/\braw\b/gi, 'uncooked');
  return {
    id: row.id,
    name: displayName,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    is_liquid: Boolean(row.is_liquid),
    serving_sizes_ml: row.serving_sizes_ml ?? null,
  };
}
