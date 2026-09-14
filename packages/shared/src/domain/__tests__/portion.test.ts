import { describe, it, expect } from 'vitest';
import { scalePortion, defaultPortionFor, servingSizesInMl } from '../portion';

const milk = { name: 'Milk', calories: 64, protein: 3.3, carbs: 4.8, fat: 3.6,
  referenceGrams: 100, isLiquid: true, servingSizesMl: [250], defaultUnit: null, unitWeightGrams: null };

const egg = { name: 'Egg', calories: 155, protein: 13, carbs: 1.1, fat: 11,
  referenceGrams: 100, isLiquid: false, servingSizesMl: null, defaultUnit: 'unit', unitWeightGrams: 50 };

const chicken = { name: 'Chicken breast', calories: 165, protein: 31, carbs: 0, fat: 3.6,
  referenceGrams: 100, isLiquid: false, servingSizesMl: null, defaultUnit: null, unitWeightGrams: null };

describe('scalePortion', () => {
  it('scales a solid per 100g', () => {
    expect(scalePortion(chicken, 200, 'g').calories).toBe(330);
  });

  it('scales a liquid by millilitres and labels the unit ml', () => {
    const r = scalePortion(milk, 250, 'ml');
    expect(r.calories).toBe(160);
    expect(r.portionUnit).toBe('ml');
  });

  it('scales a per-unit food by its unit weight', () => {
    // 2 eggs = 100g = one reference portion
    expect(scalePortion(egg, 2, 'unit').calories).toBe(155);
  });
});

describe('defaultPortionFor', () => {
  // The web seeds a drink at the reference quantity, NOT at a published serving size:
  // FoodEntryModal.tsx:293-298 has no liquid branch, and its footer reads "Values scaled
  // from 100 ml". Seeding 250 here made mobile log 2.5x the web's calories for the same
  // pick-and-save. Serving sizes stay available through servingSizesInMl, which feeds the
  // can/bottle/glass picker the user chooses from explicitly.
  it('defaults a liquid to the reference quantity in ml, matching the web', () => {
    expect(defaultPortionFor(milk)).toEqual({ amount: 100, unit: 'ml' });
  });

  it('still exposes the published serving sizes for the picker', () => {
    expect(servingSizesInMl(milk)).toEqual([250]);
  });

  it('defaults a per-unit food to one unit', () => {
    expect(defaultPortionFor(egg)).toEqual({ amount: 1, unit: 'unit' });
  });

  it('defaults a plain solid to 100g', () => {
    expect(defaultPortionFor(chicken)).toEqual({ amount: 100, unit: 'g' });
  });
});

// ---------------------------------------------------------------------------
// The shapes /api/food/search actually returns. The fixtures above follow the
// task brief; these follow `rowToResult` in backend/src/models/foodSearch.ts,
// where `serving_sizes_ml` is a jsonb object and `default_unit` is the food's
// own countable noun ('egg', 'slice', 'drumstick'), not the literal 'unit'.
// ---------------------------------------------------------------------------

/** Real /api/food/search row for a drink: serving sizes arrive as an object. */
const cola = { name: 'Cola', calories: 42, protein: 0, carbs: 10.6, fat: 0,
  referenceGrams: 100, isLiquid: true,
  servingSizesMl: { can: 330, bottle: 500, glass: 250 },
  defaultUnit: null, unitWeightGrams: null };

/** Real /api/food/search row for a countable food. */
const drumstick = { name: 'Chicken drumstick', calories: 172, protein: 28.3, carbs: 0, fat: 5.7,
  referenceGrams: 100, isLiquid: false, servingSizesMl: null,
  defaultUnit: 'drumstick', unitWeightGrams: 130 };

describe('scalePortion — real API shapes', () => {
  it('keeps a countable food labelled with its own unit noun, as the web client does', () => {
    const r = scalePortion(drumstick, 2, 'drumstick');
    // 2 x 130g = 260g -> 2.6 reference portions
    expect(r).toEqual({
      calories: 447, protein: 73.6, carbs: 0, fats: 14.8, portionUnit: 'drumstick',
    });
  });

  it('scales a drink to a whole bottle', () => {
    expect(scalePortion(milk, 500, 'ml')).toEqual({
      calories: 320, protein: 16.5, carbs: 24, fats: 18, portionUnit: 'ml',
    });
  });

  it('honours a reference basis that is not 100g', () => {
    const bar = { ...chicken, calories: 90, protein: 2, carbs: 12, fat: 4, referenceGrams: 30 };
    // one 30g bar
    expect(scalePortion(bar, 30, 'g').calories).toBe(90);
    // two of them
    expect(scalePortion(bar, 60, 'g').calories).toBe(180);
  });

  it('falls back to a 100 basis when referenceGrams is missing or nonsensical', () => {
    expect(scalePortion({ ...chicken, referenceGrams: null }, 200, 'g').calories).toBe(330);
    expect(scalePortion({ ...chicken, referenceGrams: 0 }, 200, 'g').calories).toBe(330);
  });

  it('never zeroes a countable portion that has no unit weight', () => {
    const unweighted = { ...egg, unitWeightGrams: null };
    // Defensive path: 1 unit is treated as one reference portion rather than 0g.
    expect(scalePortion(unweighted, 1, 'unit').calories).toBe(155);
  });

  it('rounds macros to one decimal and calories to a whole number', () => {
    const r = scalePortion(milk, 330, 'ml');
    expect(r.calories).toBe(211);
    expect(r.protein).toBe(10.9);
    expect(r.carbs).toBe(15.8);
    expect(r.fats).toBe(11.9);
  });
});

describe('defaultPortionFor — real API shapes', () => {
  // A published serving size is never the DEFAULT — it is an option the user picks.
  // The web's seeding path (FoodEntryModal.tsx:293-298) has no liquid branch at all, and
  // its footer states the contract: "Values scaled from 100 ml" (:703). These three cases
  // previously asserted a glass/can/bottle default, which made mobile write 2.5x-3.3x the
  // web's calories for the same pick-and-save.
  it('seeds a drink at its reference quantity regardless of published serving sizes', () => {
    expect(defaultPortionFor(cola)).toEqual({ amount: 100, unit: 'ml' });
    expect(defaultPortionFor({ ...cola, servingSizesMl: { can: 330 } })).toEqual({ amount: 100, unit: 'ml' });
    expect(defaultPortionFor({ ...cola, servingSizesMl: null })).toEqual({ amount: 100, unit: 'ml' });
  });

  // This used to assert `{ amount: 330, unit: 'ml' }` — i.e. that a non-100 reference
  // basis was honoured for the seed amount. It isn't, on the web: `handleSelectFood`
  // normalizes macros to per-100 first (`factor = DEFAULT_REFERENCE_GRAMS / refGrams`)
  // and then always seeds the LITERAL 100, never `refGrams` itself
  // (`FoodEntryModal.tsx:273-298`). Seeding 330 here was a real divergence from the web
  // for any food published at a non-100 reference; it stayed inert only because the
  // backend always publishes `referenceGrams: 100` today.
  it('still seeds the literal 100 ml even when a drink publishes a non-100 reference basis, matching the web', () => {
    expect(defaultPortionFor({ ...cola, referenceGrams: 330 })).toEqual({ amount: 100, unit: 'ml' });
  });

  // The sizes themselves remain available — this is what feeds the can/bottle/glass
  // picker the web offers at FoodEntryModal.tsx:639-646.
  it('still publishes every serving size for the picker, smallest first', () => {
    expect(servingSizesInMl(cola)).toEqual([250, 330, 500]);
    expect(servingSizesInMl({ ...cola, servingSizesMl: null })).toEqual([]);
  });

  it('defaults a countable food to one of its own units', () => {
    expect(defaultPortionFor(drumstick)).toEqual({ amount: 1, unit: 'drumstick' });
  });

  it('treats a countable food with no unit weight as a plain solid', () => {
    expect(defaultPortionFor({ ...drumstick, unitWeightGrams: null })).toEqual({ amount: 100, unit: 'g' });
  });

  // Same correction as the drink case above: this used to assert `{ amount: 30, unit:
  // 'g' }`. The web's seed amount is always the literal 100, never the food's own
  // `referenceGrams` — a 30g-reference bar shows "100 g → 300 kcal" on the web, not
  // "30 g → 90 kcal".
  it('still seeds the literal 100g even when a solid publishes a non-100 reference basis, matching the web', () => {
    expect(defaultPortionFor({ ...chicken, referenceGrams: 30 })).toEqual({ amount: 100, unit: 'g' });
  });

  // End-to-end: feeding the seeded portion straight back into scalePortion should
  // reproduce exactly what the web shows for the same food, for both a drink and a
  // solid published at a non-100 reference basis.
  it('composes with scalePortion to reproduce the web-equivalent kcal for a non-100-reference food', () => {
    const drink = { ...cola, referenceGrams: 330 };
    const seededDrink = defaultPortionFor(drink);
    expect(scalePortion(drink, seededDrink.amount, seededDrink.unit).calories).toBe(13);

    const solid = { ...chicken, calories: 90, referenceGrams: 30 };
    const seededSolid = defaultPortionFor(solid);
    expect(scalePortion(solid, seededSolid.amount, seededSolid.unit).calories).toBe(300);
  });
});
