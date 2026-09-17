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

/**
 * Spoken units. Voice is the product's primary input path, but only the ABBREVIATIONS were
 * listed in the two amount+unit regexes, so "200 grams of rice" missed both and fell through
 * to the bare-count branch as `{ amount: 200, unit: null }`. Downstream that is not a missing
 * unit, it is a wrong one: `QuickVoiceEntry` treats a unit-less number as a count of the
 * food's own unit, so "200 grams of bread" logged 200 slices — roughly a 60x overcount.
 *
 * The contract these pin is equivalence: the spoken form must produce the same
 * `ParsedFoodItem` as the abbreviation, on the canonical values the parser already emitted.
 */
describe('parseFoodItems — spoken units', () => {
  it('parses the spoken form to the same item as the abbreviation', () => {
    const spoken = parseFoodItems('200 grams of rice');
    expect(spoken).toEqual([
      { rawText: '200 grams of rice', name: 'rice', amount: 200, unit: 'g', meal: 'snack' },
    ]);
    expect(spoken[0]).toMatchObject({
      name: parseFoodItems('200g rice')[0].name,
      amount: parseFoodItems('200g rice')[0].amount,
      unit: parseFoodItems('200g rice')[0].unit,
    });
  });

  it.each([
    ['200 gram of rice', 200, 'g'],
    ['200 grams of rice', 200, 'g'],
    ['200 grams rice', 200, 'g'],
    ['2 kilogram of rice', 2, 'kg'],
    ['2 kilograms of rice', 2, 'kg'],
    ['2 kilo of rice', 2, 'kg'],
    ['2 kilos of rice', 2, 'kg'],
    ['250 millilitre of rice', 250, 'ml'],
    ['250 millilitres of rice', 250, 'ml'],
    ['250 milliliter of rice', 250, 'ml'],
    ['250 milliliters of rice', 250, 'ml'],
    ['1 litre of rice', 1, 'l'],
    ['1 litres of rice', 1, 'l'],
    ['1 liter of rice', 1, 'l'],
    ['1 liters of rice', 1, 'l'],
  ])('%s is %d %s of rice', (text, amount, unit) => {
    expect(parseFoodItems(text)[0]).toMatchObject({ name: 'rice', amount, unit });
  });

  it('never reads "kilograms" as the "kg" or "g" that sit in the same alternation', () => {
    // The 1000x version of the same bug: matching "kilograms" as "g" would log 2 g of chicken.
    expect(parseFoodItems('2 kilograms of chicken')[0].unit).toBe('kg');
    expect(parseFoodItems('2 kilograms chicken')[0]).toMatchObject({
      name: 'chicken',
      amount: 2,
      unit: 'kg',
    });
  });

  it('reads a spoken unit trailing the name', () => {
    expect(parseFoodItems('rice 200 grams')[0]).toMatchObject({
      name: 'rice',
      amount: 200,
      unit: 'g',
    });
    expect(parseFoodItems('milk 500 millilitres')[0]).toMatchObject({
      name: 'milk',
      amount: 500,
      unit: 'ml',
    });
  });

  it('is case-insensitive, as the abbreviations already were', () => {
    expect(parseFoodItems('200 Grams Of Rice')[0]).toMatchObject({
      name: 'Rice',
      amount: 200,
      unit: 'g',
    });
  });

  it('takes a decimal amount', () => {
    expect(parseFoodItems('1.5 kilograms of chicken')[0]).toMatchObject({ amount: 1.5, unit: 'kg' });
  });

  it('carries the spoken unit through a meal-bearing line', () => {
    // The end-to-end shape of the reported bug: this is what a transcript looks like.
    expect(parseFoodItems('200 grams of bread for lunch')).toEqual([
      { rawText: '200 grams of bread', name: 'bread', amount: 200, unit: 'g', meal: 'lunch' },
    ]);
  });

  it('drops the "of" from the name, on the spoken and abbreviated forms alike', () => {
    // Behaviour change, deliberate and reported: "200 g of rice" used to yield the name
    // "of rice", which is what then went to `GET /api/food/search`. Equivalence with the
    // spoken form is the point of the fix, so both now say "rice".
    expect(parseFoodItems('200 g of rice')[0].name).toBe('rice');
    expect(parseFoodItems('2 cups of rice')[0]).toMatchObject({ name: 'rice', unit: 'cups' });
  });

  it('does not eat a name that merely starts with "of"', () => {
    // `(?:of\s+)?` is guarded by its own `\s+`, so "offal" is a food and not an "of".
    expect(parseFoodItems('200 g offal')[0].name).toBe('offal');
  });
});

/**
 * The word-boundary traps. The unit group has no `\b` of its own — it is bounded by the
 * `\s+` (prefix shape) and `$` (suffix shape) that follow it. These are the inputs that
 * would break if that guard were ever loosened, e.g. to `\s*`.
 */
describe('parseFoodItems — units must not match inside a word', () => {
  it.each([
    ['200 grapes', 'grapes', 200],
    ['1 large egg', 'large egg', 1],
    ['2 programs', 'programs', 2],
    ['3 kilo-somethings', 'kilo-somethings', 3],
    ['2 litchis', 'litchis', 2],
    ['5 mlukhiyah', 'mlukhiyah', 5],
  ])('%s stays a count of %s', (text, name, amount) => {
    expect(parseFoodItems(text)[0]).toMatchObject({ name, amount, unit: null });
  });
});

/**
 * The regression guard. Everything above is additive; these are the shapes that already
 * worked and must be untouched by it.
 */
describe('parseFoodItems — abbreviated and countable units are unchanged', () => {
  it.each([
    ['250g chicken', 'chicken', 250, 'g'],
    ['250 g chicken', 'chicken', 250, 'g'],
    ['chicken breast 200g', 'chicken breast', 200, 'g'],
    ['2kg rice', 'rice', 2, 'kg'],
    ['500 ml milk', 'milk', 500, 'ml'],
    ['1 l water', 'water', 1, 'l'],
    ['4 oz steak', 'steak', 4, 'oz'],
    ['2 tbsp oil', 'oil', 2, 'tbsp'],
    ['1 tsp sugar', 'sugar', 1, 'tsp'],
    ['2 cups rice', 'rice', 2, 'cups'],
  ])('%s still parses to %s / %d / %s', (text, name, amount, unit) => {
    expect(parseFoodItems(text)[0]).toMatchObject({ name, amount, unit });
  });

  it('leaves the countable units alone', () => {
    expect(parseFoodItems('3 slices of bread')[0]).toMatchObject({
      name: 'bread',
      amount: 3,
      unit: 'slice',
    });
    expect(parseFoodItems('2 pieces of chicken')[0]).toMatchObject({ name: 'chicken', unit: 'piece' });
    expect(parseFoodItems('1 bowl of soup')[0]).toMatchObject({ name: 'soup', unit: 'bowl' });
    expect(parseFoodItems('2 eggs')[0]).toMatchObject({ name: 'eggs', amount: 2, unit: null });
  });
});
