import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Goal } from '../types/goals';
import { goalsApi } from '../core/api/goals';
import { apiGoalToGoal } from '../features/goals/mappers';
import { queryKeys } from '../lib/queryKeys';

export function useGoals() {
  const queryClient = useQueryClient();

  const {
    data: goals = [],
    isLoading: goalsLoading,
    error: goalsQueryError,
    refetch: refetchGoalsQuery,
  } = useQuery({
    queryKey: queryKeys.goals,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const list = await goalsApi.list();
      return list.map(apiGoalToGoal);
    },
  });

  const goalsError = goalsQueryError
    ? (goalsQueryError instanceof Error ? goalsQueryError.message : 'Could not load goals.')
    : null;

  const refetchGoals = useCallback(async () => {
    await refetchGoalsQuery();
  }, [refetchGoalsQuery]);

  const addMutation = useMutation({
    mutationFn: (goal: Omit<Goal, 'id' | 'createdAt'>) =>
      goalsApi.add({ type: goal.type, target: goal.target, period: goal.period }),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.goals, (prev: Goal[] | undefined) =>
        prev ? [...prev, apiGoalToGoal(created)] : [apiGoalToGoal(created)]
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Goal> }) => {
      const body: { type?: string; target?: number; period?: string } = {};
      if (updates.type !== undefined) body.type = updates.type;
      if (updates.target !== undefined) body.target = updates.target;
      if (updates.period !== undefined) body.period = updates.period;
      return goalsApi.update(id, body);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.goals, (prev: Goal[] | undefined) =>
        prev ? prev.map((g) => (g.id === updated.id ? apiGoalToGoal(updated) : g)) : [apiGoalToGoal(updated)]
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(queryKeys.goals, (prev: Goal[] | undefined) =>
        prev ? prev.filter((g) => g.id !== id) : []
      );
    },
  });

  const addGoal = useCallback(
    (goal: Omit<Goal, 'id' | 'createdAt'>): Promise<void> =>
      addMutation.mutateAsync(goal).then(() => undefined),
    [addMutation]
  );

  const updateGoal = useCallback(
    (id: string, updates: Partial<Goal>): Promise<void> =>
      updateMutation.mutateAsync({ id, updates }).then(() => undefined),
    [updateMutation]
  );

  const deleteGoal = useCallback(
    (id: string): Promise<void> => deleteMutation.mutateAsync(id).then(() => undefined),
    [deleteMutation]
  );

  const getGoalById = useCallback(
    (id: string) => goals.find((g) => g.id === id),
    [goals]
  );

  return {
    goals,
    goalsLoading,
    goalsError,
    refetchGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    getGoalById,
  };
}
