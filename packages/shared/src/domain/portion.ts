/**
 * Portion scaling for logged food.
 *
 * `/api/food/search` publishes each food's macros against a reference quantity
 * (`referenceGrams`) rather than a fixed 100 g, and tells the client how the food is
 * normally measured: `isLiquid` for drinks, `defaultUnit` + `unitWeightGrams` for
 * countable items (an egg, a slice, a drumstick). Scaling everything by `/ 100` and
 * labelling it `g` writes wrong calories for both.
 *
 * This mirrors `frontend/src/components/energy/FoodEntryModal.tsx`, which is the
 * behaviour the live web client's users already depend on: the scale factor comes from
 * `referenceGrams`, drinks are recorded in `ml`, and a countable food is recorded in its
 * own unit with `unitWeightGrams` converting the count to grams.
 */

/** Drinks publish typical serving sizes; the API sends an object, older fixtures an array. */
export type ServingSizesMl =
  | number[]
  | { can?: number; bottle?: number; glass?: number }
  | null;

/** The subset of a food search result that portion scaling needs. */
export interface PortionSource {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  referenceGrams?: number | null;
  isLiquid?: boolean;
  servingSizesMl?: ServingSizesMl;
  defaultUnit?: string | null;
  unitWeightGrams?: number | null;
}

/**
 * `'g'` for solids, `'ml'` for drinks, or the food's own countable noun — `'egg'`,
 * `'slice'`, `'drumstick'`, or the generic `'unit'`. The web client records `defaultUnit`
 * verbatim and `portionUnit` is a free-form string end to end, so anything that is
 * neither `'g'` nor `'ml'` is treated as a count of `unitWeightGrams`.
 */
export type PortionUnit = 'g' | 'ml' | 'unit' | (string & {});

export interface ScaledPortion {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portionUnit: PortionUnit;
}

/** Macros other than calories are carried to one decimal, as the web client does. */
const round = (n: number) => Math.round(n * 10) / 10;

const DEFAULT_REFERENCE_GRAMS = 100;

/** The reference quantity a food's macros are published against, guarded against bad data. */
function referenceOf(food: PortionSource): number {
  const ref = food.referenceGrams;
  return typeof ref === 'number' && ref > 0 ? ref : DEFAULT_REFERENCE_GRAMS;
}

/** True for any unit that counts whole items rather than measuring mass or volume. */
function isCountUnit(unit: PortionUnit): boolean {
  return unit !== 'g' && unit !== 'ml';
}

/**
 * Grams-equivalent of `amount` in `unit`, used as the numerator of the scale factor.
 *
 * Millilitres are treated as grams 1:1: a drink's macros are published per 100 ml, so the
 * reference basis is already volumetric and no density conversion belongs here. This is
 * what the web client does.
 */
function toGrams(food: PortionSource, amount: number, unit: PortionUnit): number {
  if (!isCountUnit(unit)) return amount;
  const perUnit = food.unitWeightGrams;
  if (typeof perUnit === 'number' && perUnit > 0) return amount * perUnit;
  // Defensive: a countable unit with no published weight. One item is treated as one
  // reference portion, which is a far better guess than one gram — and never zero, which
  // would silently log a meal as 0 kcal.
  return amount * referenceOf(food);
}

/** Scale a food's published macros to `amount` of `unit`. */
export function scalePortion(
  food: PortionSource,
  amount: number,
  unit: PortionUnit,
): ScaledPortion {
  const scale = toGrams(food, amount, unit) / referenceOf(food);
  return {
    calories: Math.round(food.calories * scale),
    protein: round(food.protein * scale),
    carbs: round(food.carbs * scale),
    fats: round(food.fat * scale),
    portionUnit: unit,
  };
}

/**
 * The portion a food should be seeded with when it is picked from search.
 *
 * Mirrors `FoodEntryModal.tsx:293-298` exactly, including for drinks. The web has only
 * TWO branches: a countable food seeds at one unit (`initialGrams = unitWeightGrams`),
 * and everything else — drinks included — seeds at the LITERAL `DEFAULT_REFERENCE_GRAMS`
 * (100), never at `food.referenceGrams` itself. Its own UI says so: "Values scaled from
 * 100 ml." (`FoodEntryModal.tsx:703`) — always 100, whatever the food's own reference
 * basis is. `handleSelectFood` (`:273-298`) first normalizes the food's macros to a
 * per-100 basis (`factor = DEFAULT_REFERENCE_GRAMS / refGrams`) and only THEN seeds the
 * portion at the literal 100 — it never re-reads `refGrams` for the seed amount. For a
 * food published at a non-100 reference (`referenceGrams: 330, calories: 42`), the web
 * shows "100 ml → 13 kcal"; seeding `referenceOf(food)` here instead (330) showed
 * "330 ml → 42 kcal" — same food, 3.3x the logged calories. Inert against today's real
 * API responses only because the backend always publishes `referenceGrams: 100`
 * (`backend/src/models/foodSearch.ts`'s `REFERENCE_GRAMS` constant,
 * `backend/src/controllers/foodSearch.ts:73`) — a future per-food reference basis would
 * have silently diverged from the web the moment it shipped.
 *
 * A drink is NOT seeded at a published serving size. The web offers can/bottle/glass as
 * an explicit choice (`FoodEntryModal.tsx:639-646`) starting from an empty selection, so
 * the serving size is something the user picks, never a default. Seeding 250ml here
 * instead of 100ml made mobile log 2.5x the calories of the web for the same
 * "pick a drink, save" action — see `servingSizesInMl` below, which still feeds that
 * picker.
 */
export function defaultPortionFor(food: PortionSource): { amount: number; unit: PortionUnit } {
  if (food.defaultUnit && food.unitWeightGrams) {
    return { amount: 1, unit: food.defaultUnit };
  }
  return { amount: DEFAULT_REFERENCE_GRAMS, unit: food.isLiquid ? 'ml' : 'g' };
}

/** Every serving size a drink publishes, smallest first, deduped. */
export function servingSizesInMl(food: PortionSource): number[] {
  const sizes = food.servingSizesMl;
  const values = !sizes
    ? []
    : Array.isArray(sizes)
      ? sizes
      : [sizes.glass, sizes.can, sizes.bottle];
  const usable = values.filter((n): n is number => typeof n === 'number' && n > 0);
  return [...new Set(usable)].sort((a, b) => a - b);
}
