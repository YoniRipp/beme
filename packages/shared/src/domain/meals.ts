/**
 * Time-of-day meal bucketing.
 *
 * Single source of truth for inferring which meal an hour belongs to. The
 * boundaries below are the LIVE WEB CLIENT's boundaries — they match
 * `frontend/src/features/energy/mealType.ts` (the reference implementation),
 * `FoodEntryModal`, and both mobile screens. Users' historical entries were
 * bucketed by exactly these cut-offs, so they must not drift.
 *
 * Note the ordering: `snack` occupies the afternoon gap (14:00-16:59) and
 * `dinner` is the open-ended tail. A non-finite hour therefore falls through to
 * `dinner`, which is what every existing call site already did.
 */
import type { MealType } from '../types/api';

/** Map an hour (0-23) to a meal bucket. Boundaries match the web client. */
export function inferMealTypeFromHour(hour: number): MealType {
  if (hour < 11) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 17) return 'snack';
  return 'dinner';
}
