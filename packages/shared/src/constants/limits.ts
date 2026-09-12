/**
 * Client-side validation limits, shared by both clients.
 *
 * These are the *client's* guard rails, not the authority: `backend/src/schemas/
 * routeSchemas.ts` is the authoritative validator. Every value here must therefore be
 * at least as strict as its server counterpart, so that anything the form accepts the
 * server also accepts. A client limit looser than the server's produces the worst
 * failure mode there is — the form says the value is fine, then the save fails.
 *
 * Server counterparts, for the fields that have one (`exerciseSchema`,
 * `createWorkoutSchema`, `createFoodEntrySchema`):
 *   sets    max 999   | reps   max 999  | weight   max 9999
 *   duration max 1440 | calories/protein/carbs/fats max 99999
 */
export const LIMITS = {
  MAX_TRANSACTION_AMOUNT: 1000000,
  MIN_TRANSACTION_AMOUNT: 0.01,
  MAX_WORKOUT_DURATION: 480, // 8 hours in minutes
  MIN_WORKOUT_DURATION: 1,
  MAX_CALORIES: 10000,
  MIN_CALORIES: 0,
  MAX_PROTEIN: 500, // grams
  MAX_CARBS: 1000, // grams
  MAX_FATS: 500, // grams
  MAX_SLEEP_HOURS: 24,
  MIN_SLEEP_HOURS: 0,
  MAX_EXERCISE_SETS: 100,
  // 999, not 1000, to match the server's `exerciseSchema`. At 1000 the form accepted a
  // rep count the server then rejected, so the save failed after the user had already
  // been told the value was valid.
  MAX_EXERCISE_REPS: 999,
  MAX_EXERCISE_WEIGHT: 1000, // lbs/kg
  // Server caps workout notes at 2000 (backend exerciseSchema's parent schemas); keep in step.
  MAX_WORKOUT_NOTES: 2000,
} as const;

// Rows fetched per exercise-catalog request (matches the server's max limit)
export const EXERCISE_CATALOG_LIMIT = 1000;
