import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Workout } from '@/types/workout';
import { workoutsApi } from '@/features/body/api';
import { apiWorkoutToWorkout } from '@/features/body/mappers';
import { queryKeys } from '@/lib/queryClient';
import { toLocalDateString } from '@/lib/dateRanges';

export function useWorkouts() {
  const queryClient = useQueryClient();

  const {
    data: workouts = [],
    isLoading: workoutsLoading,
    error: workoutsQueryError,
    refetch: refetchWorkoutsQuery,
  } = useQuery({
    queryKey: queryKeys.workouts,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const result = await workoutsApi.list();
      return result.data.map(apiWorkoutToWorkout);
    },
  });

  const workoutsError = workoutsQueryError
    ? (workoutsQueryError instanceof Error ? workoutsQueryError.message : 'Could not load workouts. Please try again.')
    : null;

  const refetchWorkouts = useCallback(async () => {
    await refetchWorkoutsQuery();
  }, [refetchWorkoutsQuery]);

  const addMutation = useMutation({
    mutationFn: (workout: Omit<Workout, 'id'>) =>
      workoutsApi.add({
        date: toLocalDateString(workout.date),
        title: workout.title,
        type: workout.type,
        durationMinutes: workout.durationMinutes,
        exercises: workout.exercises,
        notes: workout.notes,
        completed: workout.completed,
      }),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.workouts, (prev: Workout[] | undefined) =>
        prev ? [...prev, apiWorkoutToWorkout(created)] : [apiWorkoutToWorkout(created)]
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Workout> }) => {
      const body: Record<string, unknown> = {};
      if (updates.date !== undefined) body.date = toLocalDateString(updates.date);
      if (updates.title !== undefined) body.title = updates.title;
      if (updates.type !== undefined) body.type = updates.type;
      if (updates.durationMinutes !== undefined) body.durationMinutes = updates.durationMinutes;
      if (updates.exercises !== undefined) body.exercises = updates.exercises;
      if (updates.notes !== undefined) body.notes = updates.notes;
      if (updates.completed !== undefined) body.completed = updates.completed;
      return workoutsApi.update(id, body);
    },
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
    refetchWorkouts,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    toggleWorkoutCompleted,
    getWorkoutById,
  };
}
