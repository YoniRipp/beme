import { useMemo } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import { computeGoalProgress } from '@trackvibe/shared/domain';
import type { GoalProgress } from '@trackvibe/shared/domain';

// The calculation now lives in @trackvibe/shared so both clients compute a goal's
// progress identically (see packages/shared/src/domain/goals.ts). This hook stays
// here: it's the thing that's actually React — wiring the shared, pure calculator up
// to this client's own data hooks and memoizing it.
export type { GoalProgress };

export function useGoalProgress(goalId: string): GoalProgress {
  const { goals } = useGoals();
  const { workouts } = useWorkouts();
  const { foodEntries, checkIns } = useEnergy();

  return useMemo(() => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) {
      return { current: 0, target: 0, percentage: 0 };
    }

    return computeGoalProgress(goal, { foodEntries, workouts, checkIns });
  }, [goalId, goals, workouts, foodEntries, checkIns]);
}
