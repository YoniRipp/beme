/**
 * Daily targets — the one definition of what a user's daily targets are.
 *
 * Placed beside domain/goals.ts for the same reasons that module gives: pure, React- and
 * DOM-free, unit-testable without rendering, callable from a hook or straight from a screen.
 *
 * The split of stores is deliberate and is the product decision this module encodes:
 *
 *   calories  -> the `goals` table, row `type: 'calories'`, `period: 'daily'`
 *   macros    -> the profile's `macroCarbs / macroFat / macroProtein`, in grams
 *
 * The goals table cannot express protein, carbs or fat (its type enum is
 * `calories | workouts | sleep`), and the profile has no calorie column. So one card on
 * either Home reads two stores; that is a schema fact, not a client choice, and both
 * clients now make the same one. Before this module the web derived kcal from the profile
 * macros while Expo read the goals row, so the same account showed 2400 on one client and
 * 2000 on the other — and a calorie goal set on the web's own Goals page was ignored by
 * the web's own Home.
 *
 * Nothing here invents a number. An unset target resolves to `null`, never to a plausible
 * default dressed up as the user's setting.
 */

/** Kilocalories per gram, by macronutrient. Atwater factors. */
export const KCAL_PER_GRAM = { carbs: 4, fat: 9, protein: 4 } as const;

/**
 * A starting point offered by a target editor when the user has never set macros — never
 * rendered as if it were a target the user chose. These are the numbers the web's
 * `useMacroGoals` used to default to silently; they survive only as a seed for the input
 * fields, where the user sees them before pressing Save.
 */
export const SUGGESTED_MACRO_TARGETS = { carbs: 300, fat: 80, protein: 120 } as const;

/** The macro fields of a profile, structurally — the shared package never imports a client's API types. */
export interface MacroTargetSource {
  macroCarbs?: number | null;
  macroFat?: number | null;
  macroProtein?: number | null;
}

/** A goal row, structurally. Matches both clients' `Goal` and the raw API shape. */
export interface GoalTargetSource {
  type: string;
  period: string;
  target: number;
}

/** Grams per day. `null` means the user has not set that target. */
export interface MacroTargets {
  carbs: number | null;
  fat: number | null;
  protein: number | null;
}

export interface DailyTargets extends MacroTargets {
  /** Kilocalories per day, from the goals table. `null` means no target set. */
  calories: number | null;
}

/** A finite, positive number, or null. Guards against NaN and a 0 target reaching a divisor. */
function positiveOrNull(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * The kcal a set of macro grams adds up to, or `null` if any of the three is unset.
 *
 * A partial sum is not a calorie target — 120 g of protein alone is 480 kcal, which would
 * be a wildly wrong ring if shown as the day's goal. Callers use this for the "your macros
 * add up to N" hint in a target editor, not as a fallback for a missing calorie goal.
 */
export function caloriesFromMacros(macros: MacroTargets): number | null {
  const { carbs, fat, protein } = macros;
  if (carbs == null || fat == null || protein == null) return null;
  return carbs * KCAL_PER_GRAM.carbs + fat * KCAL_PER_GRAM.fat + protein * KCAL_PER_GRAM.protein;
}

/** Macro targets in grams from a profile. Each is the stored value or `null`. */
export function resolveMacroTargets(profile: MacroTargetSource | null | undefined): MacroTargets {
  return {
    carbs: positiveOrNull(profile?.macroCarbs),
    fat: positiveOrNull(profile?.macroFat),
    protein: positiveOrNull(profile?.macroProtein),
  };
}

/**
 * The first matching goal's target, or `null`.
 *
 * "First" matters: `goals` has no unique constraint on (user, type, period), the API
 * returns rows `ORDER BY created_at ASC`, and both clients have always read the oldest
 * match with `.find()`. Anything editing this target must edit that same row, or the user
 * changes a number and the dashboard keeps showing the other one.
 */
export function findGoalTarget(
  goals: readonly GoalTargetSource[] | null | undefined,
  type: string,
  period: string
): number | null {
  const match = goals?.find((g) => g.type === type && g.period === period);
  return positiveOrNull(match?.target);
}

/** The daily calorie target: the goals table's `calories` / `daily` row, or `null`. */
export function resolveCalorieTarget(goals: readonly GoalTargetSource[] | null | undefined): number | null {
  return findGoalTarget(goals, 'calories', 'daily');
}

/** The weekly workout target: the goals table's `workouts` / `weekly` row, or `null`. */
export function resolveWorkoutTarget(goals: readonly GoalTargetSource[] | null | undefined): number | null {
  return findGoalTarget(goals, 'workouts', 'weekly');
}

/** Every daily target a Home screen needs, from the two stores that hold them. */
export function resolveDailyTargets(
  goals: readonly GoalTargetSource[] | null | undefined,
  profile: MacroTargetSource | null | undefined
): DailyTargets {
  return { calories: resolveCalorieTarget(goals), ...resolveMacroTargets(profile) };
}

/**
 * Progress toward a target as a 0..1 fraction, or `null` when there is no target.
 *
 * `null` is not 0: a ring at 0% says "you have logged nothing against your goal", an empty
 * ring with no target says "there is no goal". Callers render those differently.
 */
export function targetFraction(current: number, target: number | null): number | null {
  if (target == null || target <= 0) return null;
  return Math.min(current / target, 1);
}

/** What is left of a target, clamped at 0, or `null` when there is no target. */
export function remainingToTarget(current: number, target: number | null): number | null {
  if (target == null) return null;
  return Math.max(target - current, 0);
}
