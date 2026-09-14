/**
 * Goal progress calculation.
 *
 * Moved here, verbatim, from the web client's implementation
 * (frontend/src/features/goals/useGoalProgress.ts) so both clients compute a goal's
 * `current` value identically. Mobile's only call site (mobile/src/screens/GoalsScreen.tsx)
 * never computed one at all — MobileGoalCard's `current` prop defaults to 0, nothing
 * supplied it, and every mobile goal card showed "0 / target" no matter what the user
 * had actually logged.
 *
 * Pure and React/DOM-free, so either client can call it directly (a hook, or straight
 * from a screen while iterating a goal list) and it can be unit tested without
 * rendering anything or touching React Query.
 */
import { isWithinInterval } from 'date-fns';
import type { Goal, GoalPeriod, GoalType } from '../types/goals';
import { getPeriodRange } from './dates';

export interface GoalProgress {
  current: number;
  target: number;
  percentage: number;
}

/** Raw logged data a goal's `current` is computed from. */
export interface GoalProgressDeps {
  foodEntries: { date: Date | string; calories: number }[];
  workouts: { date: Date }[];
  checkIns: { date: Date | string; sleepHours?: number }[];
}

type GoalDateRange = { start: Date; end: Date };

/**
 * One `current`-value calculator per goal type, closed over the raw logged data.
 * calories sums food entries within the date range; workouts counts sessions within
 * it; sleep averages check-ins within it that recorded a `sleepHours` (0 for a period
 * with no such check-ins, never NaN — an unlogged period should read as "nothing yet",
 * not break the UI).
 */
export function buildGoalCurrentCalcs(
  deps: GoalProgressDeps
): Record<GoalType, (goal: Goal, dateRange: GoalDateRange) => number> {
  return {
    calories: (_goal: Goal, dateRange: GoalDateRange) =>
      deps.foodEntries
        .filter((f) => isWithinInterval(new Date(f.date), dateRange))
        .reduce((sum, f) => sum + f.calories, 0),
    workouts: (_goal: Goal, dateRange: GoalDateRange) =>
      deps.workouts.filter((w) =>
        isWithinInterval(new Date(w.date), dateRange)
      ).length,
    sleep: (_goal: Goal, dateRange: GoalDateRange) => {
      const periodCheckIns = deps.checkIns.filter((c) =>
        isWithinInterval(new Date(c.date), dateRange)
      ).filter((c) => c.sleepHours != null);
      if (periodCheckIns.length === 0) return 0;
      const total = periodCheckIns.reduce((sum, c) => sum + (c.sleepHours ?? 0), 0);
      return total / periodCheckIns.length;
    },
  };
}

/**
 * A goal's current progress for its period, as of now: `current` from
 * buildGoalCurrentCalcs over the goal's period range, and `percentage` clamped to
 * [0, 100] — 0 when the goal has no positive target, guarding the divide-by-zero the
 * original guarded against.
 */
export function computeGoalProgress(goal: Goal, deps: GoalProgressDeps): GoalProgress {
  const dateRange = getPeriodRange(goal.period, new Date());
  const calcs = buildGoalCurrentCalcs(deps);
  const current = calcs[goal.type](goal, dateRange);
  const percentage = goal.target > 0 ? Math.min((current / goal.target) * 100, 100) : 0;
  return { current, target: goal.target, percentage };
}

/**
 * The noun that follows a goal's numbers on a card: "1,850 / 2,000 calories".
 *
 * These are the web Goals card's strings verbatim (the former local `GOAL_LABELS` in
 * frontend/src/components/goals/GoalCard.tsx), and the web is the reference client. Note it
 * is not internally consistent — the web's *food* cards say `kcal` where its *goal* cards
 * say `calories`, and mobile had independently copied the food noun onto its goal card.
 * Matching the reference card is the parity call here; picking one word for the whole
 * product is a separate product decision (spec open question 1).
 */
export const GOAL_UNIT_LABELS: Record<GoalType, string> = {
  calories: 'calories',
  workouts: 'workouts',
  sleep: 'hours avg',
};

/**
 * A goal's `current` or `target` as a card should print it.
 *
 * Sleep is the case that matters. `computeGoalProgress` *averages* a period's check-ins, so
 * a sleep goal's `current` is routinely something like 7.333333333333333. The web has always
 * rounded that to one decimal and suffixed the unit ("7.3h"); mobile printed the raw
 * `toLocaleString()` ("7.333"), which is the drift this shared copy removes. Every other
 * type is a whole count and just gets thousands separators.
 */
export function formatGoalValue(type: GoalType, value: number): string {
  return type === 'sleep' ? `${value.toFixed(1)}h` : value.toLocaleString();
}

/**
 * The period a *new* goal of this type should default to.
 *
 * Product behaviour, not a constraint: every type/period pair is legal (a daily workouts
 * goal and a monthly calories goal both validate on both clients and against the backend's
 * Zod enums). But you eat and sleep every day and you don't work out every day, so the
 * sensible starting point differs by type, and the web encoded that as an inline ternary
 * inside `GoalModal`. Lifted here so mobile's form gets the same defaults rather than a
 * second copy of the rule.
 *
 * New goals only — editing an existing goal must leave its period exactly as the user set
 * it, which is what the web's `!goal && …` guard around this call does.
 */
export function defaultPeriodForType(type: GoalType): GoalPeriod {
  return type === 'calories' || type === 'sleep' ? 'daily' : 'weekly';
}
