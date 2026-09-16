import { describe, it, expect } from 'vitest';
import {
  parseFoodItems,
  matchMeal,
  mealLabel,
  getMealStartTime,
  inferMealFromTime,
  textContainsMealKeyword,
} from '../foodText';
import { inferMealTypeFromHour } from '../meals';

/**
 * The parser had **no tests at all** on the web, across 148 lines of regex that sit directly
 * behind the product's stated primary input method. These pin the behaviour as it shipped, so
 * the move into `packages/shared` is provably a move and not a rewrite — including the two
 * quirks below, which are characterised deliberately rather than quietly fixed.
 */
describe('parseFoodItems', () => {
  it('reads an amount and unit leading the name', () => {
    expect(parseFoodItems('250g chicken')).toEqual([
      { rawText: '250g chicken', name: 'chicken', amount: 250, unit: 'g', meal: 'snack' },
    ]);
  });

  it('reads an amount and unit trailing the name', () => {
    expect(parseFoodItems('chicken breast 200g')[0]).toMatchObject({
      name: 'chicken breast',
      amount: 200,
      unit: 'g',
    });
  });

  it('reads a bare count', () => {
    expect(parseFoodItems('2 eggs')[0]).toMatchObject({ name: 'eggs', amount: 2, unit: null });
  });

  it('turns "3 slices of bread" into bread, counted in slices', () => {
    expect(parseFoodItems('3 slices of bread')[0]).toMatchObject({
      name: 'bread',
      amount: 3,
      unit: 'slice',
    });
  });

  it('takes the meal from a "Breakfast:" prefix', () => {
    const items = parseFoodItems('Breakfast: 2 eggs, toast');
    expect(items.map((i) => i.name)).toEqual(['eggs', 'toast']);
    expect(items.every((i) => i.meal === 'breakfast')).toBe(true);
  });

  it('takes the meal from a trailing "for breakfast"', () => {
    const items = parseFoodItems('2 eggs and toast for breakfast');
    expect(items.map((i) => i.name)).toEqual(['eggs', 'toast']);
    expect(items.every((i) => i.meal === 'breakfast')).toBe(true);
  });

  it('assigns a meal per segment when the line names several', () => {
    // Regression. This used to produce an item literally named "eggs for breakfast", filed
    // under lunch — text that then went to `GET /api/food/search`. The `$`-anchored
    // whole-line branch claimed any line ending on a meal keyword, so the per-segment branch
    // written for exactly this phrasing was unreachable.
    expect(parseFoodItems('2 eggs for breakfast, chicken for lunch')).toMatchObject([
      { name: 'eggs', amount: 2, meal: 'breakfast' },
      { name: 'chicken', meal: 'lunch' },
    ]);
  });

  it('still lets one named meal govern the whole line', () => {
    // The case the fix must not break, and the reason it counts mentions rather than simply
    // dropping the whole-line branch: one meal named means all of it, for that meal.
    expect(parseFoodItems('eggs, toast for breakfast')).toMatchObject([
      { name: 'eggs', meal: 'breakfast' },
      { name: 'toast', meal: 'breakfast' },
    ]);
  });

  it('handles three meals in one line', () => {
    expect(
      parseFoodItems('toast for breakfast, salad for lunch, steak for dinner').map(
        (i) => `${i.name}:${i.meal}`
      )
    ).toEqual(['toast:breakfast', 'salad:lunch', 'steak:dinner']);
  });

  it('defaults to snack when no meal is named anywhere', () => {
    expect(parseFoodItems('rice')[0].meal).toBe('snack');
  });

  it('carries a named meal forward when the line does not end on one', () => {
    // Reachable only here: the line ends with "rice", so the `$`-anchored branch above misses
    // and the per-segment loop actually runs. `currentMeal` then carries to later segments.
    expect(parseFoodItems('chicken for lunch, rice')).toMatchObject([
      { name: 'chicken', meal: 'lunch' },
      { name: 'rice', meal: 'lunch' },
    ]);
  });

  it('puts both items in lunch when only lunch is named, whichever order they come in', () => {
    // One mention, so the whole line is lunch — the reading a user means by "rice, chicken
    // for lunch". The mirrored phrasing reaches the same answer down the per-segment path.
    expect(parseFoodItems('rice, chicken for lunch').map((i) => `${i.name}:${i.meal}`)).toEqual([
      'rice:lunch',
      'chicken:lunch',
    ]);
    expect(parseFoodItems('chicken for lunch, rice').map((i) => `${i.name}:${i.meal}`)).toEqual([
      'chicken:lunch',
      'rice:lunch',
    ]);
  });

  it('splits "mac and cheese" into two items — a known limitation, not an intent', () => {
    // The web's comment claims it keeps "and" inside food names. It never has. Recorded so
    // the next reader trusts the test over the comment; the review step is the mitigation.
    expect(parseFoodItems('mac and cheese').map((i) => i.name)).toEqual(['mac', 'cheese']);
  });

  it('handles several lines independently', () => {
    const items = parseFoodItems('Breakfast: eggs\nLunch: rice');
    expect(items).toMatchObject([
      { name: 'eggs', meal: 'breakfast' },
      { name: 'rice', meal: 'lunch' },
    ]);
  });

  it('ignores blank input and stray whitespace', () => {
    expect(parseFoodItems('')).toEqual([]);
    expect(parseFoodItems('  \n \n ')).toEqual([]);
    expect(parseFoodItems(',,,')).toEqual([]);
  });
});

describe('meal vocabulary', () => {
  it('parses to the canonical lowercase MealType, which is what the API stores', () => {
    // `food_entries.meal_type` is lowercase — `global/domain-conventions.md`. The web parsed
    // to 'Breakfast' and called .toLowerCase() at three separate call sites.
    expect(parseFoodItems('Breakfast: eggs')[0].meal).toBe('breakfast');
    expect(matchMeal('something for DINNER')).toBe('dinner');
  });

  it('keeps the display label separate from the stored value', () => {
    expect(mealLabel('breakfast')).toBe('Breakfast');
    expect(mealLabel('snack')).toBe('Snack');
  });

  it('gives each meal its start time', () => {
    expect(getMealStartTime('breakfast')).toBe('08:00');
    expect(getMealStartTime('lunch')).toBe('12:30');
    expect(getMealStartTime('snack')).toBe('15:00');
    expect(getMealStartTime('dinner')).toBe('18:00');
  });

  it('detects whether a meal was named at all', () => {
    expect(textContainsMealKeyword('2 eggs for breakfast')).toBe(true);
    expect(textContainsMealKeyword('2 eggs')).toBe(false);
  });

  it('returns null from matchMeal when no meal is named', () => {
    expect(matchMeal('chicken and rice')).toBeNull();
  });
});

describe('inferMealFromTime', () => {
  it.each([
    [7, 'breakfast'],
    [10, 'breakfast'],
    [11, 'lunch'],
    [13, 'lunch'],
    [14, 'snack'],
    [16, 'snack'],
    [17, 'dinner'],
    [23, 'dinner'],
  ] as const)('%i:00 is %s', (hour, expected) => {
    const at = new Date(2026, 8, 16, hour, 0, 0);
    expect(inferMealFromTime(at)).toBe(expected);
  });

  it('agrees with inferMealTypeFromHour at every hour, because it is that function', () => {
    // The web carried its own copy with the same 11/14/17 cut-offs. Two implementations of
    // one rule stay equal only until someone edits one, and `meals.ts` is explicit that
    // historical entries were bucketed by exactly these boundaries.
    for (let hour = 0; hour < 24; hour++) {
      expect(inferMealFromTime(new Date(2026, 8, 16, hour))).toBe(inferMealTypeFromHour(hour));
    }
  });
});
