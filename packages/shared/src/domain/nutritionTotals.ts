/**
 * Nutrition totals for a period — summed for a single day, averaged per day for anything longer.
 *
 * This exists because the two clients printed different numbers for the same rows. The web has
 * always divided a multi-day total by the number of days that actually have entries
 * (`frontend/src/pages/Energy.tsx`); the Expo client summed them raw
 * (`mobile/src/screens/EnergyScreen.tsx`). On a seven-day week that is roughly 13,000 kcal
 * against 1,850 — and the screens carry the same heading, so there is no way for a user with
 * both to tell which one is lying.
 *
 * **Days with entries, not days in the period.** Someone who logged on two days of a month sees
 * the average of those two days, not a month's worth of zeroes dragging it to nothing. That is
 * the behaviour the web shipped and it is the defensible one: the number answers "what does a
 * day I track look like", which is what a user comparing weeks is asking.
 *
 * The day key is the LOCAL calendar day. Entries carry a real local `Date` by the time they
 * reach here (both clients' mappers run the API's `YYYY-MM-DD` through `parseLocalDateString`),
 * so `toDateString()` is safe — but note it is the only correct choice available: keying on the
 * `Date` objects themselves counts entries rather than days, because every entry has its own
 * instance.
 *
 * Only calories are rounded, matching the web. The macros stay fractional and are rounded at the
 * point of display, so three macro figures cannot round independently and then disagree with a
 * total computed from them.
 */

/** The fields this works over — anything with the four macros and a local date. */
export interface NutritionRow {
  date: Date;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  /** How many distinct local days contributed. 0 for an empty period. */
  daysCounted: number;
  /** True when the figures above are a per-day average rather than a sum. */
  averaged: boolean;
}

const ZERO = { calories: 0, protein: 0, carbs: 0, fats: 0 };

/**
 * @param rows   the entries already filtered to the period
 * @param period 'daily' sums; every other period averages per day
 */
export function periodNutritionTotals(
  rows: readonly NutritionRow[],
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
): NutritionTotals {
  const summed = rows.reduce(
    (acc, row) => ({
      calories: acc.calories + row.calories,
      protein: acc.protein + row.protein,
      carbs: acc.carbs + row.carbs,
      fats: acc.fats + row.fats,
    }),
    { ...ZERO },
  );

  if (period === 'daily' || rows.length === 0) {
    return { ...summed, daysCounted: rows.length === 0 ? 0 : 1, averaged: false };
  }

  const daysCounted = new Set(rows.map((row) => row.date.toDateString())).size;

  // One day of entries inside a week is still one day's food. Dividing by 1 is a no-op, but
  // saying so explicitly keeps `averaged` honest: nothing was averaged.
  if (daysCounted <= 1) {
    return { ...summed, daysCounted, averaged: false };
  }

  return {
    calories: Math.round(summed.calories / daysCounted),
    protein: summed.protein / daysCounted,
    carbs: summed.carbs / daysCounted,
    fats: summed.fats / daysCounted,
    daysCounted,
    averaged: true,
  };
}
