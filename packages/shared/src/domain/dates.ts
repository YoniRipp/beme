/**
 * Local-calendar date helpers and period ranges.
 *
 * Single source of truth for both clients. Every function here works from LOCAL
 * calendar parts — never `toISOString().slice(0, 10)`, which shifts the day for
 * any zone behind UTC and is the class of bug already open against the food
 * entry date column.
 */
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns';

/** Local calendar date YYYY-MM-DD for API/forms (avoids UTC shift). */
export function toLocalDateString(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Parse API date string YYYY-MM-DD as local date (avoids UTC midnight shifting day). */
export function parseLocalDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date(dateStr);
  return new Date(y, m - 1, d);
}

/** Week starts Sunday (0), ends Saturday. Use for all weekly ranges. */
export const WEEK_SUNDAY = { weekStartsOn: 0 } as const;

export type PeriodKey = 'daily' | 'weekly' | 'monthly' | 'yearly';

const PERIOD_GETTERS: Record<PeriodKey, (ref: Date) => { start: Date; end: Date }> = {
  daily: (ref) => ({ start: startOfDay(ref), end: endOfDay(ref) }),
  weekly: (ref) => ({ start: startOfWeek(ref, WEEK_SUNDAY), end: endOfWeek(ref, WEEK_SUNDAY) }),
  monthly: (ref) => ({ start: startOfMonth(ref), end: endOfMonth(ref) }),
  yearly: (ref) => ({ start: startOfYear(ref), end: endOfYear(ref) }),
};

export function getPeriodRange(
  period: PeriodKey,
  refDate: Date = new Date()
): { start: Date; end: Date } {
  return PERIOD_GETTERS[period](refDate);
}

export type TrendPeriodKey = 'week' | 'month' | 'year';

export interface TrendPeriodBounds {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
}

const TREND_PERIOD_GETTERS: Record<TrendPeriodKey, (ref: Date) => TrendPeriodBounds> = {
  week: (ref) => ({
    currentStart: startOfWeek(ref, WEEK_SUNDAY),
    currentEnd: endOfWeek(ref, WEEK_SUNDAY),
    previousStart: startOfWeek(subWeeks(ref, 1), WEEK_SUNDAY),
    previousEnd: endOfWeek(subWeeks(ref, 1), WEEK_SUNDAY),
  }),
  month: (ref) => ({
    currentStart: startOfMonth(ref),
    currentEnd: endOfMonth(ref),
    previousStart: startOfMonth(subMonths(ref, 1)),
    previousEnd: endOfMonth(subMonths(ref, 1)),
  }),
  year: (ref) => ({
    currentStart: startOfYear(ref),
    currentEnd: endOfYear(ref),
    previousStart: startOfYear(subYears(ref, 1)),
    previousEnd: endOfYear(subYears(ref, 1)),
  }),
};

export function getTrendPeriodBounds(
  period: TrendPeriodKey,
  refDate: Date = new Date()
): TrendPeriodBounds {
  return TREND_PERIOD_GETTERS[period](refDate);
}
