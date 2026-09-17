import { describe, it, expect } from 'vitest';
import { periodNutritionTotals, type NutritionRow } from '../nutritionTotals';

/**
 * The bug this closes: the two clients printed different numbers for the same rows. The web
 * averaged a multi-day total per day; the Expo client summed it raw. Same heading, same data,
 * ~7x apart on a week.
 *
 * So the assertions below are not "does the arithmetic work" — they are "do the two clients now
 * agree, and does the averaging key on days rather than entries".
 */
const day = (iso: string, calories: number, macro = 10): NutritionRow => {
  const [y, m, d] = iso.split('-').map(Number);
  return { date: new Date(y, m - 1, d), calories, protein: macro, carbs: macro, fats: macro };
};

describe('periodNutritionTotals', () => {
  it('sums a single day rather than averaging it', () => {
    const rows = [day('2026-09-17', 600), day('2026-09-17', 500), day('2026-09-17', 750)];

    const totals = periodNutritionTotals(rows, 'daily');

    expect(totals.calories).toBe(1850);
    expect(totals.averaged).toBe(false);
  });

  /**
   * The regression test. Seven days at 1,850 kcal is ~13,000 summed — which is what the Expo
   * client used to render under a heading the web rendered 1,850 under.
   */
  it('averages a week per day, so a week does not read like a binge', () => {
    const rows = Array.from({ length: 7 }, (_, i) => day(`2026-09-${11 + i}`, 1850));

    const totals = periodNutritionTotals(rows, 'weekly');

    expect(totals.calories).toBe(1850);
    expect(totals.daysCounted).toBe(7);
    expect(totals.averaged).toBe(true);
  });

  /**
   * Every entry is its own `Date` instance, so a Set of the objects counts entries. Keying on the
   * calendar day is the whole mechanism, and this is the case that tells them apart: 6 entries
   * across 2 days must divide by 2, not by 6.
   */
  it('divides by distinct days, not by the number of entries', () => {
    const rows = [
      day('2026-09-16', 400), day('2026-09-16', 400), day('2026-09-16', 400),
      day('2026-09-17', 200), day('2026-09-17', 200), day('2026-09-17', 200),
    ];

    const totals = periodNutritionTotals(rows, 'weekly');

    expect(totals.daysCounted).toBe(2);
    expect(totals.calories).toBe(900);
  });

  it('treats two entries at different times of one day as one day', () => {
    const rows: NutritionRow[] = [
      { date: new Date(2026, 8, 17, 8, 30), calories: 500, protein: 1, carbs: 1, fats: 1 },
      { date: new Date(2026, 8, 17, 19, 45), calories: 700, protein: 1, carbs: 1, fats: 1 },
    ];

    const totals = periodNutritionTotals(rows, 'monthly');

    expect(totals.daysCounted).toBe(1);
    expect(totals.calories).toBe(1200);
    expect(totals.averaged).toBe(false);
  });

  it('leaves macros fractional so a rounded display cannot disagree with itself', () => {
    const rows = [day('2026-09-16', 300, 10), day('2026-09-17', 300, 11)];

    const totals = periodNutritionTotals(rows, 'weekly');

    expect(totals.protein).toBe(10.5);
    expect(totals.calories).toBe(300);
  });

  it('reports an empty period as zero with no days, not as an average of nothing', () => {
    const totals = periodNutritionTotals([], 'yearly');

    expect(totals).toMatchObject({ calories: 0, protein: 0, carbs: 0, fats: 0, daysCounted: 0, averaged: false });
  });

  it('does not average a period that happens to hold one day', () => {
    const totals = periodNutritionTotals([day('2026-09-17', 1850)], 'monthly');

    expect(totals.calories).toBe(1850);
    expect(totals.averaged).toBe(false);
  });
});
