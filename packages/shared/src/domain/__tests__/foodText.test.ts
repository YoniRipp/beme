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

  it('BUG: a line naming two meals puts everything in the last one, and keeps "for <meal>" in the name', () => {
    // This is the shipped behaviour, pinned so the move into `packages/shared` is provably a
    // move. It is also wrong, and worth stating plainly: the item is named "eggs for
    // breakfast" — text that then gets sent to `GET /api/food/search` — and it is filed under
    // lunch.
    //
    // Cause: the "<items> for <meal>" branch is anchored with `$`, so it matches the WHOLE
    // line whenever the line ends with a meal keyword, and `(.+?)` backtracks until it does.
    // The per-segment branch below it — the one written to handle several meals in one line —
    // is therefore unreachable for exactly the phrasing it exists for.
    //
    // Fixed in the commit after this one, which is where the behaviour change belongs.
    expect(parseFoodItems('2 eggs for breakfast, chicken for lunch')).toMatchObject([
      { name: 'eggs for breakfast', meal: 'lunch' },
      { name: 'chicken', meal: 'lunch' },
    ]);
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

  it('BUG: the same two items in the other order both land in lunch', () => {
    // "rice, chicken for lunch" ends on a meal keyword, so the whole-line branch claims it and
    // rice is swept into lunch as well. Same root cause as the case above.
    expect(parseFoodItems('rice, chicken for lunch')).toMatchObject([
      { name: 'rice', meal: 'lunch' },
      { name: 'chicken', meal: 'lunch' },
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
