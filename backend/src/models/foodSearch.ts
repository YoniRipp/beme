/**
 * Food search model — foods table lookup (name, calories, protein, carbs, fat).
 */
import { Pool } from 'pg';
import { getPool } from '../db/pool.js';
import { escapeLike } from '../utils/escapeLike.js';

const REFERENCE_GRAMS = 100;

/** Use "uncooked" consistently (not "raw") for display. */
function normalizePreparationName(name: string, preparation: string | null | undefined): string {
  if (!name || typeof name !== 'string') return name;
  const prep = (preparation || 'cooked').toLowerCase();
  if (prep === 'uncooked') return name.replace(/\braw\b/gi, 'uncooked');
  return name;
}

function rowToResult(row: Record<string, unknown>) {
  const name = normalizePreparationName(row.name as string, row.preparation as string | null);
  return {
    name,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    referenceGrams: REFERENCE_GRAMS,
    isLiquid: Boolean(row.is_liquid),
    servingSizesMl: (row.serving_sizes_ml as unknown) ?? null,
    preparation: (row.preparation as string) ?? 'cooked',
  };
}

/** Approximate grams per unit for countable/portion items (e.g. eggs, bananas). */
const PORTION_GRAMS: Record<string, number> = {
  egg: 50, eggs: 50, banana: 120, bananas: 120, apple: 180, apples: 180,
  slice: 30, slices: 30, piece: 50, pieces: 50, serving: 100, servings: 100,
};

export function unitToGrams(amount: number | string, unit: string | null | undefined): number {
  const u = (unit || 'g').toLowerCase().replace(/\s+/g, '');
  const n = Number(amount);
  const num = Number.isFinite(n) && n > 0 ? n : 100;
  if (u === 'g') return num;
  if (u === 'kg') return num * 1000;
  if (u === 'ml' || u === 'l') return num * (u === 'l' ? 1000 : 1);
  if (['cup', 'tbsp', 'tsp'].includes(u)) return (u === 'cup' ? 240 : u === 'tbsp' ? 15 : 5) * num;
  if (PORTION_GRAMS[u] != null) return PORTION_GRAMS[u] * num;
  return num;
}

/**
 * Look up one food by name and return scaled nutrition.
 * preferUncooked: when true, prefer rows with preparation = 'uncooked' (e.g. "uncooked rice").
 */
export async function getNutritionForFoodName(pool: Pool, foodName: string, amount: number | string, unit: string | null | undefined, preferUncooked = false) {
  const name = typeof foodName === 'string' ? foodName.trim() : '';
  if (!name) return null;
  const wantPrep = preferUncooked ? 'uncooked' : 'cooked';
  const result = await pool.query(
    `SELECT id, name, calories, protein, carbs, fat, is_liquid, preparation
     FROM foods
     WHERE lower(name) LIKE $1
     ORDER BY (COALESCE(preparation, 'cooked') = $2) DESC, length(name) ASC
     LIMIT 1`,
    ['%' + escapeLike(name.toLowerCase()) + '%', wantPrep]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const grams = unitToGrams(amount, unit);
  const scale = grams / REFERENCE_GRAMS;
  const displayName = normalizePreparationName(row.name, row.preparation);
  return {
    name: displayName,
    calories: Math.round(Number(row.calories) * scale),
    protein: Math.round(Number(row.protein) * scale * 10) / 10,
    carbs: Math.round(Number(row.carbs) * scale * 10) / 10,
    fat: Math.round(Number(row.fat) * scale * 10) / 10,
    isLiquid: Boolean(row.is_liquid),
  };
}

export async function search(q: string, limit = 10) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, name, calories, protein, carbs, fat, is_liquid, serving_sizes_ml, preparation
     FROM foods
     WHERE lower(name) LIKE $1
     ORDER BY name
     LIMIT $2`,
    ['%' + escapeLike(q.toLowerCase()) + '%', limit]
  );
  return result.rows.map(rowToResult);
}

/** Look up a food by barcode (indexed). */
export async function getByBarcode(pool: Pool, barcode: string) {
  const result = await pool.query(
    `SELECT id, name, calories, protein, carbs, fat, is_liquid, serving_sizes_ml, preparation, barcode, image_url
     FROM foods
     WHERE barcode = $1
     LIMIT 1`,
    [barcode]
  );
  if (result.rows.length === 0) return null;
  return { ...rowToResult(result.rows[0]), barcode: result.rows[0].barcode as string | null, imageUrl: result.rows[0].image_url as string | null };
}

/** Insert a food from OFF or Gemini into the local DB (auto-cache). Returns the inserted row. */
export async function cacheFood(pool: Pool, food: {
  name: string;
  name_he?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_liquid: boolean;
  barcode?: string | null;
  source: string;
  off_id?: string | null;
  image_url?: string | null;
  preparation?: string;
}) {
  const result = await pool.query(
    `INSERT INTO foods (name, name_he, calories, protein, carbs, fat, is_liquid, barcode, source, off_id, image_url, preparation)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (off_id) WHERE off_id IS NOT NULL DO UPDATE SET
       name = EXCLUDED.name,
       calories = EXCLUDED.calories,
       protein = EXCLUDED.protein,
       carbs = EXCLUDED.carbs,
       fat = EXCLUDED.fat,
       is_liquid = EXCLUDED.is_liquid,
       image_url = EXCLUDED.image_url
     RETURNING id, name, calories, protein, carbs, fat, is_liquid, serving_sizes_ml, preparation, barcode, image_url`,
    [
      food.name,
      food.name_he ?? null,
      food.calories,
      food.protein,
      food.carbs,
      food.fat,
      food.is_liquid,
      food.barcode ?? null,
      food.source,
      food.off_id ?? null,
      food.image_url ?? null,
      food.preparation ?? 'cooked',
    ]
  );
  const row = result.rows[0];
  return { ...rowToResult(row), barcode: row.barcode as string | null, imageUrl: row.image_url as string | null };
}
