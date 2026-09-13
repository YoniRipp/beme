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
import type { Goal, GoalType } from '../types/goals';
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
