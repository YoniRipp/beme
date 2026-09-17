/**
 * The weight card's numbers — latest reading, distance to target, short-term trend, and the
 * normalised sparkline.
 *
 * Pure and client-agnostic, for the reason `domain/targets.ts` gives: both Homes draw the
 * same card from the same rows, and the arithmetic is the part that must not drift. The web
 * had it inline in `frontend/src/components/home/WeightProgress.tsx`; this is that logic,
 * not a second interpretation of it.
 */

/** A weight row, structurally — shared never imports a client's API types. */
export interface WeightEntrySource {
  id?: string;
  /** `YYYY-MM-DD`, newest first as every list endpoint returns them. */
  date: string;
  weight: number;
}

/** How many readings the sparkline draws, and the span the trend is measured over. */
export const WEIGHT_TREND_POINTS = 7;

/**
 * How many rows either client reads to draw everything weight-related.
 *
 * A LIMIT rather than a date window, deliberately: the model orders `date DESC`
 * (`backend/src/models/weight.ts:46`), so a limit means "the N most recent readings" and
 * always contains the latest one. A 90-day window would show "No weight logged yet" to
 * someone whose last weigh-in was in the spring — which is not what the card means.
 *
 * 30 is set by the hungriest consumer: the web's Insights chart plots the last 30 readings
 * (`frontend/src/pages/Insights.tsx`). The Home card on both clients needs only
 * `WEIGHT_TREND_POINTS` of them, so this is the Insights number with the card riding along.
 *
 * Lives here rather than in either client because both draw the same card from the same
 * rows, and a bound that disagrees between them is a bug nobody would see until the chart
 * on one client quietly ran short.
 */
export const WEIGHT_HISTORY_LIMIT = 30;

/** The shortest a bar may be drawn, as a percentage, so a flat week is still visible. */
export const WEIGHT_BAR_MIN_PERCENT = 10;

export interface WeightSparklineBar {
  /** The entry's own id where it has one, else its index — a React key. */
  key: string;
  weight: number;
  /** 10..100. The bar's height as a percentage of the sparkline's box. */
  heightPercent: number;
}

export interface WeightSummary {
  /** The most recent reading, or `null` when nothing has been logged. */
  current: number | null;
  /** The profile's target weight, or `null` when unset. */
  target: number | null;
  /** `current - target`. Positive means above target. `null` when either side is missing. */
  diffToTarget: number | null;
  /**
   * Change across the last `WEIGHT_TREND_POINTS` readings — newest minus oldest. Negative is
   * a loss. `null` until there are at least two readings to compare.
   *
   * Labelled "kg / wk" by both clients. That label is an approximation the web already
   * ships: seven READINGS are only seven days if the user weighs in daily.
   */
  trend: number | null;
  /** Oldest-first, so the sparkline reads left to right like a timeline. */
  bars: WeightSparklineBar[];
}

/** Treats a missing, non-finite or non-positive value as absent — nobody weighs 0 kg. */
function realWeight(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * @param entries Weight rows newest first, as every list endpoint returns them.
 * @param targetWeight The profile's `targetWeight`, in kilograms.
 */
export function summarizeWeight(
  entries: readonly WeightEntrySource[],
  targetWeight: number | null | undefined
): WeightSummary {
  const recent = entries.slice(0, WEIGHT_TREND_POINTS);
  const current = realWeight(recent[0]?.weight);
  const target = realWeight(targetWeight);

  const trend =
    recent.length >= 2 ? recent[0].weight - recent[recent.length - 1].weight : null;

  return {
    current,
    target,
    diffToTarget: current != null && target != null ? current - target : null,
    trend,
    bars: recent.length >= 2 ? sparklineBars(recent) : [],
  };
}

/** Normalises the readings to 10..100% of the box, oldest first. */
function sparklineBars(recentNewestFirst: readonly WeightEntrySource[]): WeightSparklineBar[] {
  const weights = recentNewestFirst.map((e) => e.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  // A flat week has no range to normalise against; `|| 1` makes every bar the minimum
  // height rather than NaN. Same guard the web carries (`WeightProgress.tsx:88`).
  const range = max - min || 1;

  return [...recentNewestFirst].reverse().map((entry, i) => ({
    key: entry.id ?? String(i),
    weight: entry.weight,
    heightPercent: Math.max(((entry.weight - min) / range) * 100, WEIGHT_BAR_MIN_PERCENT),
  }));
}
