import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Workout } from '../types/workout';
import { workoutsApi } from '../core/api/workouts';
import { apiWorkoutToWorkout, workoutToApiWorkout } from '../features/body/mappers';
import { queryKeys } from '../lib/queryKeys';
import { toLocalDateString } from '../lib/dateRanges';

/**
 * The request body for a workout update.
 *
 * Forwards every field the caller actually set, rather than an allowlist. The allowlist
 * this replaced omitted `completed`, so a caller could set it, get no error, and find the
 * change had never been sent — the same field-dropping bug the exercise mapper had
 * (`src/features/body/mappers.ts`). `date` is the one field needing a shape change on the
 * way out (Date → local YYYY-MM-DD); everything else passes through untouched.
 *
 * Exported as a plain function so the contract can be pinned without rendering the hook:
 * a React Query client in a test leaves a notifyManager batch timer that outlives the run
 * and hangs jest, and the logic here is pure anyway.
 */
export function buildWorkoutUpdateBody(updates: Partial<Workout>): Record<string, unknown> {
  const { date, ...rest } = updates;
  const body: Record<string, unknown> = { ...rest };
  if (date !== undefined) body.date = toLocalDateString(date);
  return body;
}

export function useWorkouts() {
  const queryClient = useQueryClient();

  const {
    data: workouts = [],
    isLoading: workoutsLoading,
    error: workoutsQueryError,
    refetch: refetchWorkoutsQuery,
  } = useQuery({
    queryKey: queryKeys.workouts,
    // Always explicit, per agent-os/standards/frontend/data-fetching.md; 2 min matches
    // frontend/src/hooks/useWorkouts.ts. This inherited the 60s client default.
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const workouts = await workoutsApi.listAll();
      return workouts.map(apiWorkoutToWorkout);
    },
  });

  const workoutsError = workoutsQueryError
    ? (workoutsQueryError instanceof Error ? workoutsQueryError.message : 'Could not load workouts.')
    : null;

  const refetchWorkouts = useCallback(async () => {
    await refetchWorkoutsQuery();
  }, [refetchWorkoutsQuery]);

  const addMutation = useMutation({
    mutationFn: (workout: Omit<Workout, 'id'>) => workoutsApi.add(workoutToApiWorkout(workout)),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.workouts, (prev: Workout[] | undefined) =>
        prev ? [...prev, apiWorkoutToWorkout(created)] : [apiWorkoutToWorkout(created)]
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Workout> }) =>
      workoutsApi.update(id, buildWorkoutUpdateBody(updates)),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.workouts, (prev: Workout[] | undefined) =>
        prev ? prev.map((w) => (w.id === updated.id ? apiWorkoutToWorkout(updated) : w)) : [apiWorkoutToWorkout(updated)]
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workoutsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(queryKeys.workouts, (prev: Workout[] | undefined) =>
        prev ? prev.filter((w) => w.id !== id) : []
      );
    },
  });

  const addWorkout = useCallback(
    (workout: Omit<Workout, 'id'>): Promise<void> =>
      addMutation.mutateAsync(workout).then(() => undefined),
    [addMutation]
  );

  const updateWorkout = useCallback(
    (id: string, updates: Partial<Workout>): Promise<void> =>
      updateMutation.mutateAsync({ id, updates }).then(() => undefined),
    [updateMutation]
  );

  const deleteWorkout = useCallback(
    (id: string): Promise<void> => deleteMutation.mutateAsync(id).then(() => undefined),
    [deleteMutation]
  );

  const getWorkoutById = useCallback(
    (id: string) => workouts.find((w) => w.id === id),
    [workouts]
  );

  return {
    workouts,
    workoutsLoading,
    workoutsError,
    refetchWorkouts,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    getWorkoutById,
  };
}
