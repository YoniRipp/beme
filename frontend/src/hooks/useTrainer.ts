import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainerApi } from '@/core/api/trainer';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import type { DailyCheckIn, FoodEntry } from '@/types/energy';
import type { Goal } from '@/types/goals';
import type { Workout } from '@/types/workout';
import { toLocalDateString } from '@/lib/dateRanges';

export function useTrainerClients() {
  return useQuery({
    queryKey: queryKeys.trainerClients,
    queryFn: () => trainerApi.listClients(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTrainerInvitations() {
  return useQuery({
    queryKey: queryKeys.trainerInvitations,
    queryFn: () => trainerApi.listInvitations(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useInviteByEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => trainerApi.inviteByEmail(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trainerInvitations });
    },
  });
}

export function useGenerateInviteCode() {
  return useMutation({
    mutationFn: () => trainerApi.generateInviteCode(),
  });
}

export function useRemoveClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientId: string) => trainerApi.removeClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trainerClients });
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  const { loadUser } = useAuth();
  return useMutation({
    mutationFn: (inviteCode: string) => trainerApi.acceptInvitation(inviteCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingTrainerInvitations });
      queryClient.invalidateQueries({ queryKey: queryKeys.myTrainer });
      // Refresh user data so subscription status updates (trainee gets pro)
      loadUser();
    },
  });
}

export function useMyTrainer() {
  return useQuery({
    queryKey: queryKeys.myTrainer,
    queryFn: () => trainerApi.getMyTrainer(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePendingTrainerInvitations() {
  return useQuery({
    queryKey: queryKeys.pendingTrainerInvitations,
    queryFn: () => trainerApi.getPendingInvitations(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTrainerClientWorkouts(clientId: string) {
  return useQuery({
    queryKey: [...queryKeys.trainerClientData(clientId), 'workouts'] as const,
    queryFn: () => trainerApi.getClientWorkouts(clientId),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTrainerClientFoodEntries(clientId: string) {
  return useQuery({
    queryKey: [...queryKeys.trainerClientData(clientId), 'foodEntries'] as const,
    queryFn: () => trainerApi.getClientFoodEntries(clientId),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTrainerClientCheckIns(clientId: string) {
  return useQuery({
    queryKey: [...queryKeys.trainerClientData(clientId), 'checkIns'] as const,
    queryFn: () => trainerApi.getClientCheckIns(clientId),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTrainerClientGoals(clientId: string) {
  return useQuery({
    queryKey: [...queryKeys.trainerClientData(clientId), 'goals'] as const,
    queryFn: () => trainerApi.getClientGoals(clientId),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTrainerClientWater(clientId: string) {
  return useQuery({
    queryKey: [...queryKeys.trainerClientData(clientId), 'water'] as const,
    queryFn: () => trainerApi.getClientWater(clientId),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}

function useInvalidateTrainerClient(clientId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.trainerClientData(clientId) });
}

export function useAddTrainerClientWorkout(clientId: string) {
  const invalidateClient = useInvalidateTrainerClient(clientId);
  return useMutation({
    mutationFn: (workout: Omit<Workout, 'id'>) =>
      trainerApi.addClientWorkout(clientId, {
        date: toLocalDateString(workout.date),
        title: workout.title,
        type: workout.type,
        durationMinutes: workout.durationMinutes,
        exercises: workout.exercises,
        notes: workout.notes,
        completed: workout.completed,
      }),
    onSuccess: invalidateClient,
  });
}

export function useUpdateTrainerClientWorkout(clientId: string) {
  const invalidateClient = useInvalidateTrainerClient(clientId);
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Workout> }) => {
      const body: Record<string, unknown> = {};
      if (updates.date !== undefined) body.date = toLocalDateString(updates.date);
      if (updates.title !== undefined) body.title = updates.title;
      if (updates.type !== undefined) body.type = updates.type;
      if (updates.durationMinutes !== undefined) body.durationMinutes = updates.durationMinutes;
      if (updates.exercises !== undefined) body.exercises = updates.exercises;
      if (updates.notes !== undefined) body.notes = updates.notes;
      if (updates.completed !== undefined) body.completed = updates.completed;
      return trainerApi.updateClientWorkout(clientId, id, body);
    },
    onSuccess: invalidateClient,
  });
}

export function useDeleteTrainerClientWorkout(clientId: string) {
  const invalidateClient = useInvalidateTrainerClient(clientId);
  return useMutation({
    mutationFn: (id: string) => trainerApi.deleteClientWorkout(clientId, id),
    onSuccess: invalidateClient,
  });
}

export function useAddTrainerClientFoodEntry(clientId: string) {
  const invalidateClient = useInvalidateTrainerClient(clientId);
  return useMutation({
    mutationFn: (entry: Omit<FoodEntry, 'id'>) =>
      trainerApi.addClientFoodEntry(clientId, {
        date: toLocalDateString(entry.date),
        name: entry.name,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fats: entry.fats,
        portionAmount: entry.portionAmount,
        portionUnit: entry.portionUnit,
        servingType: entry.servingType,
        startTime: entry.startTime,
        endTime: entry.endTime,
        mealType: entry.mealType,
      }),
    onSuccess: invalidateClient,
  });
}

export function useUpdateTrainerClientFoodEntry(clientId: string) {
  const invalidateClient = useInvalidateTrainerClient(clientId);
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<FoodEntry> }) => {
      const body: Record<string, unknown> = {};
      if (updates.date !== undefined) body.date = toLocalDateString(updates.date);
      if (updates.name !== undefined) body.name = updates.name;
      if (updates.calories !== undefined) body.calories = updates.calories;
      if (updates.protein !== undefined) body.protein = updates.protein;
      if (updates.carbs !== undefined) body.carbs = updates.carbs;
      if (updates.fats !== undefined) body.fats = updates.fats;
      if (updates.portionAmount !== undefined) body.portionAmount = updates.portionAmount;
      if (updates.portionUnit !== undefined) body.portionUnit = updates.portionUnit;
      if (updates.servingType !== undefined) body.servingType = updates.servingType;
      if (updates.startTime !== undefined) body.startTime = updates.startTime;
      if (updates.endTime !== undefined) body.endTime = updates.endTime;
      if (updates.mealType !== undefined) body.mealType = updates.mealType;
      return trainerApi.updateClientFoodEntry(clientId, id, body);
    },
    onSuccess: invalidateClient,
  });
}

export function useDeleteTrainerClientFoodEntry(clientId: string) {
  const invalidateClient = useInvalidateTrainerClient(clientId);
  return useMutation({
    mutationFn: (id: string) => trainerApi.deleteClientFoodEntry(clientId, id),
    onSuccess: invalidateClient,
  });
}

export function useAddTrainerClientCheckIn(clientId: string) {
  const invalidateClient = useInvalidateTrainerClient(clientId);
  return useMutation({
    mutationFn: (checkIn: Omit<DailyCheckIn, 'id'>) =>
      trainerApi.addClientCheckIn(clientId, {
        date: toLocalDateString(checkIn.date),
        sleepHours: checkIn.sleepHours,
      }),
    onSuccess: invalidateClient,
  });
}

export function useUpdateTrainerClientCheckIn(clientId: string) {
  const invalidateClient = useInvalidateTrainerClient(clientId);
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DailyCheckIn> }) => {
      const body: Record<string, unknown> = {};
      if (updates.date !== undefined) body.date = toLocalDateString(updates.date);
      if (updates.sleepHours !== undefined) body.sleepHours = updates.sleepHours;
      return trainerApi.updateClientCheckIn(clientId, id, body);
    },
    onSuccess: invalidateClient,
  });
}

export function useDeleteTrainerClientCheckIn(clientId: string) {
  const invalidateClient = useInvalidateTrainerClient(clientId);
  return useMutation({
    mutationFn: (id: string) => trainerApi.deleteClientCheckIn(clientId, id),
    onSuccess: invalidateClient,
  });
}

export function useAddTrainerClientGoal(clientId: string) {
  const invalidateClient = useInvalidateTrainerClient(clientId);
  return useMutation({
    mutationFn: (goal: Omit<Goal, 'id' | 'createdAt'>) =>
      trainerApi.addClientGoal(clientId, {
        type: goal.type,
        target: goal.target,
        period: goal.period,
      }),
    onSuccess: invalidateClient,
  });
}

export function useUpdateTrainerClientGoal(clientId: string) {
  const invalidateClient = useInvalidateTrainerClient(clientId);
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Goal> }) => {
      const body: Record<string, unknown> = {};
      if (updates.type !== undefined) body.type = updates.type;
      if (updates.target !== undefined) body.target = updates.target;
      if (updates.period !== undefined) body.period = updates.period;
      return trainerApi.updateClientGoal(clientId, id, body);
    },
    onSuccess: invalidateClient,
  });
}

export function useDeleteTrainerClientGoal(clientId: string) {
  const invalidateClient = useInvalidateTrainerClient(clientId);
  return useMutation({
    mutationFn: (id: string) => trainerApi.deleteClientGoal(clientId, id),
    onSuccess: invalidateClient,
  });
}
