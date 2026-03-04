import { useMemo } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import type { Goal, GoalType } from '@/types/goals';
import { isWithinInterval } from 'date-fns';
import { getPeriodRange } from '@/lib/dateRanges';

export interface GoalProgress {
  current: number;
  target: number;
  percentage: number;
}

function buildGoalCurrentCalcs(deps: {
  foodEntries: { date: Date | string; calories: number }[];
  workouts: { date: Date }[];
  checkIns: { date: Date | string; sleepHours?: number }[];
}) {
  return {
    calories: (_goal: Goal, dateRange: { start: Date; end: Date }) =>
      deps.foodEntries
        .filter((f) => isWithinInterval(new Date(f.date), dateRange))
        .reduce((sum, f) => sum + f.calories, 0),
    workouts: (_goal: Goal, dateRange: { start: Date; end: Date }) =>
      deps.workouts.filter((w) =>
        isWithinInterval(new Date(w.date), dateRange)
      ).length,
    sleep: (_goal: Goal, dateRange: { start: Date; end: Date }) => {
      const periodCheckIns = deps.checkIns.filter((c) =>
        isWithinInterval(new Date(c.date), dateRange)
      ).filter((c) => c.sleepHours != null);
      if (periodCheckIns.length === 0) return 0;
      const total = periodCheckIns.reduce((sum, c) => sum + (c.sleepHours ?? 0), 0);
      return total / periodCheckIns.length;
    },
  } as Record<GoalType, (goal: Goal, dateRange: { start: Date; end: Date }) => number>;
}

export function useGoalProgress(goalId: string): GoalProgress {
  const { goals } = useGoals();
  const { workouts } = useWorkouts();
  const { foodEntries, checkIns } = useEnergy();

  return useMemo(() => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) {
      return { current: 0, target: 0, percentage: 0 };
    }

    const now = new Date();
    const dateRange = getPeriodRange(goal.period, now);
    const calcs = buildGoalCurrentCalcs({
      foodEntries,
      workouts,
      checkIns,
    });
    const current = calcs[goal.type](goal, dateRange);

    const percentage =
      goal.target > 0 ? Math.min((current / goal.target) * 100, 100) : 0;
    return { current, target: goal.target, percentage };
  }, [goalId, goals, workouts, foodEntries, checkIns]);
}
