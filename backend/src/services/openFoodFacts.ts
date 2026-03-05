/**
 * Open Food Facts API client.
 * Free, no API key. Rate limits: 100 barcode/min, 10 search/min.
 * All nutrition values are per 100g (solids) or per 100ml (liquids).
 */
import { logger } from '../lib/logger.js';

const OFF_BASE = 'https://world.openfoodfacts.org';
const USER_AGENT = 'BeMe/1.0 (beme-app)';
const TIMEOUT_MS = 5000;

const PRODUCT_FIELDS = [
  'code', 'product_name', 'product_name_he', 'product_name_en',
  'nutriments', 'categories_tags', 'image_url', 'countries_tags', 'brands',
].join(',');

const LIQUID_KEYWORDS = ['beverage', 'drink', 'juice', 'water', 'soda', 'milk', 'tea', 'coffee'];

export interface OFFProduct {
  code: string;
  product_name?: string;
  product_name_he?: string;
  product_name_en?: string;
  nutriments?: Record<string, unknown>;
  categories_tags?: string[];
  image_url?: string;
  countries_tags?: string[];
  brands?: string;
}

export interface OFFFoodRow {
  name: string;
  name_he: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_liquid: boolean;
  barcode: string | null;
  source: 'open_food_facts';
  off_id: string;
  image_url: string | null;
  preparation: string;
}

function isLiquidFromCategories(categories: string[]): boolean {
  return categories.some((c) =>
    LIQUID_KEYWORDS.some((kw) => c.includes(kw))
  );
}

/** Convert an OFF product to our foods table row shape. Returns null if insufficient data. */
export function offProductToFood(product: OFFProduct): OFFFoodRow | null {
  const name = (product.product_name_en || product.product_name || '').trim();
  if (!name) return null;

  const n = product.nutriments ?? {};
  const calories = Number(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0);
  const protein = Number(n['proteins_100g'] ?? n['proteins'] ?? 0);
  const carbs = Number(n['carbohydrates_100g'] ?? n['carbohydrates'] ?? 0);
  const fat = Number(n['fat_100g'] ?? n['fat'] ?? 0);

  // Skip products with no nutrition data at all
  if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) return null;

  const categories = product.categories_tags ?? [];
  const isLiquid = isLiquidFromCategories(categories);

  return {
    name,
    name_he: (product.product_name_he || '').trim() || null,
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    is_liquid: isLiquid,
    barcode: product.code || null,
    source: 'open_food_facts',
    off_id: product.code || '',
    image_url: product.image_url || null,
    preparation: 'cooked',
  };
}

/** Look up a product by barcode. Returns null on miss or error. */
export async function getByBarcode(barcode: string): Promise<OFFFoodRow | null> {
  try {
    const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${PRODUCT_FIELDS}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json() as { status?: number; product?: OFFProduct };
    if (data.status !== 1 || !data.product) return null;
    return offProductToFood(data.product);
  } catch (e) {
    logger.warn({ err: e, barcode }, 'OFF barcode lookup failed');
    return null;
  }
}

/** Search products by name. Returns up to `limit` results. */
export async function searchByName(query: string, limit = 5): Promise<OFFFoodRow[]> {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      json: '1',
      page_size: String(limit),
      fields: PRODUCT_FIELDS,
    });
    const url = `${OFF_BASE}/cgi/search.pl?${params}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data = await res.json() as { products?: OFFProduct[] };
    if (!Array.isArray(data.products)) return [];
    return data.products
      .map(offProductToFood)
      .filter((f): f is OFFFoodRow => f !== null);
  } catch (e) {
    logger.warn({ err: e, query }, 'OFF search failed');
    return [];
  }
}
