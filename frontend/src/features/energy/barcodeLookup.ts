/**
 * Looks up food nutrition data by barcode.
 * Primary: backend endpoint (auto-caches to local DB for instant future lookups).
 * Fallback: direct Open Food Facts API call.
 */
import { getApiBase } from '@/core/api/client';

export interface BarcodeProduct {
  name: string;
  calories: number; // kcal per 100g/ml
  protein: number;  // g per 100g/ml
  carbs: number;    // g per 100g/ml
  fat: number;      // g per 100g/ml
  isLiquid: boolean;
}

/** Lookup via backend (auto-caches result in local DB). */
async function lookupViaBackend(barcode: string): Promise<BarcodeProduct | null> {
  const base = getApiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/food/barcode/${encodeURIComponent(barcode)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.name) return null;
    return {
      name: data.name,
      calories: Number(data.calories ?? 0),
      protein: Number(data.protein ?? 0),
      carbs: Number(data.carbs ?? 0),
      fat: Number(data.fat ?? 0),
      isLiquid: Boolean(data.isLiquid),
    };
  } catch {
    return null;
  }
}

/** Direct OFF API fallback (when backend is unavailable). */
async function lookupViaOFF(barcode: string): Promise<BarcodeProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,nutriments,categories_tags`;

  let data: any;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    data = await res.json();
  } catch {
    return null;
  }

  if (data?.status !== 1 || !data?.product) return null;

  const p = data.product;
  const n = p.nutriments ?? {};

  const name: string = p.product_name?.trim() || '';
  if (!name) return null;

  const calories = Number(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0);
  const protein  = Number(n['proteins_100g']    ?? n['proteins']    ?? 0);
  const carbs    = Number(n['carbohydrates_100g'] ?? n['carbohydrates'] ?? 0);
  const fat      = Number(n['fat_100g']          ?? n['fat']         ?? 0);

  const categories: string[] = p.categories_tags ?? [];
  const isLiquid = categories.some((c: string) =>
    c.includes('beverage') || c.includes('drink') || c.includes('juice') || c.includes('water')
  );

  return { name, calories, protein, carbs, fat, isLiquid };
}

export async function lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
  // Try backend first (auto-caches for instant future lookups)
  const backendResult = await lookupViaBackend(barcode);
  if (backendResult) return backendResult;

  // Fallback to direct OFF API
  return lookupViaOFF(barcode);
}
