/**
 * One-time import of USDA FoodData Central Foundation Foods JSON into foods table.
 * Run from repo root: node backend/scripts/importFoundationFoods.js
 * Or from backend: node scripts/importFoundationFoods.js
 * Requires DATABASE_URL (e.g. in backend/.env).
 *
 * Expects JSON shape: { "FoundationFoods": [ { description, foodNutrients, foodClass }, ... ] }
 * Inserts into foods (name, calories, protein, carbs, fat).
 */

import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Pool: PgPool } = pg;

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const NUTRIENT_ENERGY_KCAL = '208';
const NUTRIENT_ENERGY_KJ = '268';
const NUTRIENT_PROTEIN = '203';
const NUTRIENT_CARBS = '205';
const NUTRIENT_FAT = '204';
const KJ_TO_KCAL = 1 / 4.184;
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Common-name extraction (mirrors extractCommonName in foodSearch.ts)
// ---------------------------------------------------------------------------
const KEEP_QUALIFIERS = new Set([
  'white', 'brown', 'whole', 'skim', 'nonfat', 'lowfat', 'low-fat',
  'breast', 'thigh', 'leg', 'wing', 'drumstick', 'ground', 'lean',
  'dark', 'light', 'sweet', 'wild', 'basmati', 'jasmine',
  'long-grain', 'long grain', 'medium-grain', 'medium grain',
  'short-grain', 'short grain', 'whole wheat', 'whole-wheat',
  'yellow', 'red', 'green', 'black', 'pinto', 'navy', 'kidney',
  'cheddar', 'mozzarella', 'parmesan', 'swiss', 'provolone', 'gouda',
  'atlantic', 'pacific', 'chinook', 'sockeye', 'pink',
  'extra lean', 'extra-lean', 'fresh', 'frozen', 'canned', 'dried',
]);
const COOKING_METHODS = new Set([
  'cooked', 'raw', 'uncooked', 'grilled', 'baked', 'fried',
  'boiled', 'steamed', 'roasted', 'scrambled', 'poached',
  'braised', 'sauteed', 'sautéed', 'broiled', 'smoked',
  'stewed', 'microwaved', 'pan-fried',
]);
const NOISE_RE = [
  /^broilers?\s+or\s+fryers?$/i, /^meat\s+only$/i, /^skinless$/i, /^boneless$/i,
  /^without\s+skin$/i, /^with\s+skin$/i, /^skin\s+not\s+eaten$/i, /^separable\s+lean/i,
  /^enriched$/i, /^unenriched$/i, /^not\s+fortified$/i, /^fortified$/i,
  /^plain$/i, /^regular$/i, /^mature\s+seeds$/i, /^dry$/i, /^dry\s+form$/i,
  /^all[- ]purpose$/i, /^from\s+concentrate$/i, /^shelf\s+stable$/i,
  /^solids\s+and\s+liquids?$/i, /^drained/i, /^packed\s+in\s+/i,
  /^no\s+salt\s+added$/i, /^with(out)?\s+added\s+/i, /^NFS$/i, /^NS\s+as\s+to/i,
  /^\d+%\s+fat$/i, /^fat\s+free$/i, /^reduced\s+fat$/i, /^commercially\s+prepared$/i,
  /^made\s+with\s+/i, /^prepared\s+from\s+/i, /^pre-?cooked$/i, /^trimmed\s+to/i,
  /^refuse\s*:/i, /^bone[- ]?(in|less)$/i,
];
const NOUN_PARTS = new Set(['breast', 'thigh', 'leg', 'wing', 'drumstick', 'ground']);

function extractCommonName(description) {
  if (!description) return description;
  const segments = description.split(',').map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return description;

  const main = segments[0];
  const qualifiers = [];
  const methods = [];

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const segLower = seg.toLowerCase();
    if (NOISE_RE.some((r) => r.test(seg))) continue;
    if (COOKING_METHODS.has(segLower)) { methods.push(segLower); continue; }
    if (KEEP_QUALIFIERS.has(segLower)) { qualifiers.push(segLower); continue; }
    const words = segLower.split(/\s+/);
    if (words.length <= 2 && words.some((w) => KEEP_QUALIFIERS.has(w))) {
      qualifiers.push(segLower);
    }
  }

  const adjectives = qualifiers.filter((q) => !NOUN_PARTS.has(q));
  const nouns = qualifiers.filter((q) => NOUN_PARTS.has(q));

  let cn = adjectives.length > 0
    ? adjectives.join(' ').replace(/^./, (c) => c.toUpperCase()) + ' ' + main.toLowerCase()
    : main.charAt(0).toUpperCase() + main.slice(1).toLowerCase();
  if (nouns.length > 0) cn += ' ' + nouns.join(' ');

  const specific = methods.filter((m) => m !== 'cooked' && m !== 'raw' && m !== 'uncooked');
  if (specific.length > 0) cn += ', ' + specific[specific.length - 1];

  return cn.trim();
}

function getNutrientValue(foodNutrients, number) {
  const numStr = String(number);
  const item = foodNutrients.find(
    (n) => n.nutrient && (String(n.nutrient.number) === numStr || n.nutrient.number === number)
  );
  if (!item) return null;
  const v = item.amount ?? item.median;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

const LIQUID_KEYWORDS = ['beverage', 'beverages', 'drink', 'drinks', 'juice', 'juices', 'soda', 'sodas'];

function isLiquidFromObject(obj) {
  const desc = (typeof obj.description === 'string' ? obj.description : '').toLowerCase();
  const foodClass = (typeof obj.foodClass === 'string' ? obj.foodClass : '').toLowerCase();
  const combined = `${desc} ${foodClass}`;
  return LIQUID_KEYWORDS.some((kw) => combined.includes(kw));
}

function parseFoodObject(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const description = typeof obj.description === 'string' ? obj.description.trim() : '';
  if (!description) return null;
  const foodNutrients = Array.isArray(obj.foodNutrients) ? obj.foodNutrients : [];
  const caloriesKcal = getNutrientValue(foodNutrients, NUTRIENT_ENERGY_KCAL);
  const caloriesKj = getNutrientValue(foodNutrients, NUTRIENT_ENERGY_KJ);
  const calories =
    caloriesKcal != null
      ? Math.round(caloriesKcal)
      : caloriesKj != null
        ? Math.round(caloriesKj * KJ_TO_KCAL)
        : 0;
  const protein = getNutrientValue(foodNutrients, NUTRIENT_PROTEIN) ?? 0;
  const carbs = getNutrientValue(foodNutrients, NUTRIENT_CARBS) ?? 0;
  const fat = getNutrientValue(foodNutrients, NUTRIENT_FAT) ?? 0;
  let caloriesFinal = calories;
  if (caloriesFinal === 0 && (protein > 0 || carbs > 0 || fat > 0)) {
    caloriesFinal = Math.round(4 * protein + 4 * carbs + 9 * fat);
  }
  const is_liquid = isLiquidFromObject(obj);
  const descLower = description.toLowerCase();
  const preparation = /\b(uncooked|raw)\b/.test(descLower) ? 'uncooked' : 'cooked';
  return {
    name: description,
    common_name: extractCommonName(description),
    calories: caloriesFinal,
    protein: Number(protein),
    carbs: Number(carbs),
    fat: Number(fat),
    is_liquid,
    preparation,
  };
}

async function run() {
  const jsonPath =
    process.argv[2] || resolve(join(__dirname, '../../FoodData_Central_foundation_food_json_2025-12-18.json'));
  console.log('Using JSON path:', jsonPath);

  const raw = await readFile(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  const foods = Array.isArray(data.FoundationFoods) ? data.FoundationFoods : [];
  console.log('Found', foods.length, 'foods in JSON');

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required. Set it in backend/.env');
    process.exit(1);
  }
  const pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE TABLE foods');
    console.log('Truncated foods.');

    let batch = [];
    let total = 0;

    for (const obj of foods) {
      const row = parseFoodObject(obj);
      if (!row) continue;
      batch.push(row);
      if (batch.length >= BATCH_SIZE) {
      const values = batch.flatMap((r) => [
        r.name,
        r.common_name || r.name,
        r.calories,
        r.protein,
        r.carbs,
        r.fat,
        r.is_liquid ?? false,
        r.preparation ?? 'cooked',
      ]);
      const placeholders = batch
        .map(
          (_, i) =>
            `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`
        )
        .join(', ');
        await client.query(
          `INSERT INTO foods (name, common_name, calories, protein, carbs, fat, is_liquid, preparation) VALUES ${placeholders}`,
          values
        );
        total += batch.length;
        console.log('Inserted', total, 'rows');
        batch = [];
      }
    }
    if (batch.length > 0) {
      const values = batch.flatMap((r) => [
        r.name,
        r.calories,
        r.protein,
        r.carbs,
        r.fat,
        r.is_liquid ?? false,
        r.preparation ?? 'cooked',
      ]);
      const placeholders = batch
        .map(
          (_, i) =>
            `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`
        )
        .join(', ');
      await client.query(
        `INSERT INTO foods (name, calories, protein, carbs, fat, is_liquid, preparation) VALUES ${placeholders}`,
        values
      );
      total += batch.length;
    }
    console.log('Done. Total rows imported:', total);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
