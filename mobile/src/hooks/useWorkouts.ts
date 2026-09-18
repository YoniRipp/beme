import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Workout } from '../types/workout';
import { workoutsApi } from '../core/api/workouts';
import { apiWorkoutToWorkout, workoutToApiWorkout } from '../features/body/mappers';
import { queryKeys } from '../lib/queryKeys';
import { updateCachedList } from '../lib/cachedList';
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
    data: workoutsData,
    isLoading: workoutsLoading,
    error: workoutsQueryError,
    refetch: refetchWorkoutsQuery,
  } = useQuery({
    queryKey: queryKeys.workouts,
    staleTime: 2 * 60 * 1000, // explicit, matching frontend/src/hooks/useWorkouts.ts
    queryFn: async () => {
      const { items, truncated } = await workoutsApi.listAll();
      return { items: items.map(apiWorkoutToWorkout), truncated };
    },
  });

  const workouts = workoutsData?.items ?? [];
  // The pager stops at a bound (packages/shared/src/api/pagination.ts) and reports it. Every
  // caller used to discard that, so a clipped history rendered as a complete one.
  const workoutsTruncated = workoutsData?.truncated ?? false;

  const workoutsError = workoutsQueryError
    ? (workoutsQueryError instanceof Error ? workoutsQueryError.message : 'Could not load workouts.')
    : null;

  const refetchWorkouts = useCallback(async () => {
    await refetchWorkoutsQuery();
  }, [refetchWorkoutsQuery]);

  const addMutation = useMutation({
    mutationFn: (workout: Omit<Workout, 'id'>) => workoutsApi.add(workoutToApiWorkout(workout)),
    onSuccess: (created) => {
      updateCachedList<Workout>(queryClient, queryKeys.workouts, (prev) =>
        [...prev, apiWorkoutToWorkout(created)]
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Workout> }) =>
      workoutsApi.update(id, buildWorkoutUpdateBody(updates)),
    onSuccess: (updated) => {
      updateCachedList<Workout>(queryClient, queryKeys.workouts, (prev) =>
        prev.map((w) => (w.id === updated.id ? apiWorkoutToWorkout(updated) : w))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workoutsApi.delete(id),
    onSuccess: (_, id) => {
      updateCachedList<Workout>(queryClient, queryKeys.workouts, (prev) =>
        prev.filter((w) => w.id !== id)
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

  /**
   * Ticks a workout off, or un-ticks it. Same signature as the web hook's
   * (`frontend/src/hooks/useWorkouts.ts`) so the shared card contract is identical on
   * both clients, and it rides the existing update mutation — `buildWorkoutUpdateBody`
   * already forwards `completed`, so there is no wire work here.
   */
  const toggleWorkoutCompleted = useCallback(
    (id: string, completed: boolean): Promise<void> =>
      updateMutation.mutateAsync({ id, updates: { completed } }).then(() => undefined),
    [updateMutation]
  );

  const getWorkoutById = useCallback(
    (id: string) => workouts.find((w) => w.id === id),
    [workouts]
  );

  return {
    workouts,
    workoutsLoading,
    workoutsError,
    workoutsTruncated,
    refetchWorkouts,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    toggleWorkoutCompleted,
    getWorkoutById,
  };
}
