import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainerApi } from '@/core/api/trainer';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';

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

export function useAddClientWorkout(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => trainerApi.addClientWorkout(clientId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.trainerClientData(clientId), 'workouts'] }),
  });
}

export function useUpdateClientWorkout(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => trainerApi.updateClientWorkout(clientId, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.trainerClientData(clientId), 'workouts'] }),
  });
}

export function useRemoveClientWorkout(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workoutId: string) => trainerApi.removeClientWorkout(clientId, workoutId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.trainerClientData(clientId), 'workouts'] }),
  });
}

export function useAddClientFoodEntry(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => trainerApi.addClientFoodEntry(clientId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.trainerClientData(clientId), 'foodEntries'] }),
  });
}

export function useUpdateClientFoodEntry(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => trainerApi.updateClientFoodEntry(clientId, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.trainerClientData(clientId), 'foodEntries'] }),
  });
}

export function useRemoveClientFoodEntry(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => trainerApi.removeClientFoodEntry(clientId, entryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.trainerClientData(clientId), 'foodEntries'] }),
  });
}

export function useAddClientCheckIn(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => trainerApi.addClientCheckIn(clientId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.trainerClientData(clientId), 'checkIns'] }),
  });
}

export function useUpdateClientCheckIn(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => trainerApi.updateClientCheckIn(clientId, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.trainerClientData(clientId), 'checkIns'] }),
  });
}

export function useAddClientGoal(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => trainerApi.addClientGoal(clientId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.trainerClientData(clientId), 'goals'] }),
  });
}

export function useUpdateClientGoal(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => trainerApi.updateClientGoal(clientId, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.trainerClientData(clientId), 'goals'] }),
  });
}

export function useRemoveClientGoal(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => trainerApi.removeClientGoal(clientId, goalId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.trainerClientData(clientId), 'goals'] }),
  });
}
