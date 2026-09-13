import { scalePortion, defaultPortionFor } from '@trackvibe/shared/domain';
import { portionPresetsFor } from '../FoodEntryFormScreen';
import type { FoodSearchResult } from '../../core/api/food';

const chicken: FoodSearchResult = {
  name: 'Chicken breast', calories: 165, protein: 31, carbs: 0, fat: 3.6,
  referenceGrams: 100, isLiquid: false, servingSizesMl: null,
  defaultUnit: null, unitWeightGrams: null,
};

const milk: FoodSearchResult = {
  name: 'Milk', calories: 64, protein: 3.3, carbs: 4.8, fat: 3.6,
  referenceGrams: 100, isLiquid: true,
  servingSizesMl: { can: 330, bottle: 500, glass: 250 },
  defaultUnit: null, unitWeightGrams: null,
};

const egg: FoodSearchResult = {
  name: 'Egg', calories: 155, protein: 13, carbs: 1.1, fat: 11,
  referenceGrams: 100, isLiquid: false, servingSizesMl: null,
  defaultUnit: 'egg', unitWeightGrams: 50,
};

describe('food entry portion defaults', () => {
  it('seeds a solid with grams', () => {
    expect(defaultPortionFor(chicken)).toEqual({ amount: 100, unit: 'g' });
  });

  // Millilitres, and the reference quantity — not a serving size. The web's seeding path
  // (frontend/src/components/energy/FoodEntryModal.tsx:293-298) has no liquid branch, and
  // its own footer says "Values scaled from 100 ml" (:703). This test previously asserted
  // 250, which meant picking a drink on mobile logged 2.5x the calories it logs on the web.
  it('seeds a drink with millilitres at the reference quantity, as the web does', () => {
    expect(defaultPortionFor(milk)).toEqual({ amount: 100, unit: 'ml' });
  });

  it('seeds a countable food with one of its own units', () => {
    expect(defaultPortionFor(egg)).toEqual({ amount: 1, unit: 'egg' });
  });
});

describe('food entry portion scaling', () => {
  it('records a glass of milk as 250 ml with the macros of 250 ml', () => {
    const r = scalePortion(milk, 250, 'ml');
    expect(r).toEqual({ calories: 160, protein: 8.3, carbs: 12, fats: 9, portionUnit: 'ml' });
  });

  it('records one egg as 50 g worth of macros, not 100 g', () => {
    const r = scalePortion(egg, 1, 'egg');
    expect(r.calories).toBe(78);
    expect(r.portionUnit).toBe('egg');
  });

  it('still scales an ordinary solid per 100 g', () => {
    expect(scalePortion(chicken, 200, 'g')).toEqual({
      calories: 330, protein: 62, carbs: 0, fats: 7.2, portionUnit: 'g',
    });
  });
});

describe('portionPresetsFor', () => {
  it('offers gram presets around the reference basis for a solid', () => {
    expect(portionPresetsFor(chicken)).toEqual({ unit: 'g', presets: [50, 100, 150, 200] });
  });

  it('offers the drink its published serving sizes in ml', () => {
    expect(portionPresetsFor(milk)).toEqual({ unit: 'ml', presets: [250, 330, 500] });
  });

  it('offers a countable food whole-unit presets', () => {
    expect(portionPresetsFor(egg)).toEqual({ unit: 'egg', presets: [1, 2, 3, 4] });
  });

  it('falls back to the old gram presets when nothing is selected', () => {
    expect(portionPresetsFor(null)).toEqual({ unit: 'g', presets: [50, 100, 150, 200] });
  });

  it('follows the entry\'s own unit when editing, where there is no food row', () => {
    expect(portionPresetsFor(null, 'ml')).toEqual({ unit: 'ml', presets: [250, 330, 500] });
    expect(portionPresetsFor(null, 'egg')).toEqual({ unit: 'egg', presets: [1, 2, 3, 4] });
  });

  it('offers presets around a reference basis that is not 100 g', () => {
    expect(portionPresetsFor({ ...chicken, referenceGrams: 30 })).toEqual({
      unit: 'g', presets: [15, 30, 45, 60],
    });
  });

  it('falls back to glass/can/bottle for a drink with no published serving sizes', () => {
    expect(portionPresetsFor({ ...milk, servingSizesMl: null })).toEqual({
      unit: 'ml', presets: [250, 330, 500],
    });
  });
});

describe('worked examples from the task report', () => {
  it('records a bottle of milk as 500 ml', () => {
    expect(scalePortion(milk, 500, 'ml')).toEqual({
      calories: 320, protein: 16.5, carbs: 24, fats: 18, portionUnit: 'ml',
    });
  });

  it('records two eggs as one reference portion', () => {
    expect(scalePortion(egg, 2, 'egg')).toEqual({
      calories: 155, protein: 13, carbs: 1.1, fats: 11, portionUnit: 'egg',
    });
  });

  it('records one egg as half a reference portion', () => {
    expect(scalePortion(egg, 1, 'egg')).toEqual({
      calories: 78, protein: 6.5, carbs: 0.6, fats: 5.5, portionUnit: 'egg',
    });
  });
});
