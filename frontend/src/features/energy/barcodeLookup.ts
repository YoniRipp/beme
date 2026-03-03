/**
 * Looks up food nutrition data by barcode using the Open Food Facts API.
 * Free, no API key required. Returns null if the product is not found.
 */
export interface BarcodeProduct {
  name: string;
  calories: number; // kcal per 100g/ml
  protein: number;  // g per 100g/ml
  carbs: number;    // g per 100g/ml
  fat: number;      // g per 100g/ml
  isLiquid: boolean;
}

export async function lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
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
