import { describe, it, expect } from 'vitest';
import { scalePortion, defaultPortionFor } from '../portion';

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
  it('defaults a liquid to its first serving size in ml', () => {
    expect(defaultPortionFor(milk)).toEqual({ amount: 250, unit: 'ml' });
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
  it('defaults a drink with object serving sizes to a glass', () => {
    expect(defaultPortionFor(cola)).toEqual({ amount: 250, unit: 'ml' });
  });

  it('falls back to a can, then a bottle, when no glass size is published', () => {
    expect(defaultPortionFor({ ...cola, servingSizesMl: { can: 330 } })).toEqual({ amount: 330, unit: 'ml' });
    expect(defaultPortionFor({ ...cola, servingSizesMl: { bottle: 500 } })).toEqual({ amount: 500, unit: 'ml' });
  });

  it('defaults a drink with no serving sizes at all to 250 ml', () => {
    expect(defaultPortionFor({ ...cola, servingSizesMl: null })).toEqual({ amount: 250, unit: 'ml' });
  });

  it('defaults a countable food to one of its own units', () => {
    expect(defaultPortionFor(drumstick)).toEqual({ amount: 1, unit: 'drumstick' });
  });

  it('treats a countable food with no unit weight as a plain solid', () => {
    expect(defaultPortionFor({ ...drumstick, unitWeightGrams: null })).toEqual({ amount: 100, unit: 'g' });
  });

  it('seeds a non-100g solid with its own reference basis', () => {
    expect(defaultPortionFor({ ...chicken, referenceGrams: 30 })).toEqual({ amount: 30, unit: 'g' });
  });
});
