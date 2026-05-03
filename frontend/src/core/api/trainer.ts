import { request } from './client';
import type { ApiDailyCheckIn, ApiFoodEntry } from './food';
import type { ApiGoal } from './goals';
import type { ApiWorkout } from './workouts';

export interface TrainerClient {
  id: string;
  trainerId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  status: string;
  createdAt: string;
}

export interface TrainerInvitation {
  id: string;
  trainerId: string;
  email?: string;
  inviteCode?: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  trainerName?: string;
}

export interface ClientDataResponse<T = Record<string, unknown>> {
  data: T[];
  total: number;
}

export const trainerApi = {
  listClients: () =>
    request<TrainerClient[]>('/api/trainer/clients'),

  inviteByEmail: (email: string) =>
    request<TrainerInvitation>('/api/trainer/invite', { method: 'POST', body: { email } }),

  generateInviteCode: () =>
    request<{ inviteCode: string; expiresAt: string }>('/api/trainer/invite-code', { method: 'POST' }),

  listInvitations: () =>
    request<TrainerInvitation[]>('/api/trainer/invitations'),

  removeClient: (clientId: string) =>
    request<void>(`/api/trainer/clients/${clientId}`, { method: 'DELETE' }),

  acceptInvitation: (inviteCode: string) =>
    request<{ message: string }>('/api/trainer/accept-invite', { method: 'POST', body: { inviteCode } }),

  getMyTrainer: () =>
    request<{ trainer: { id: string; name: string; email: string } | null }>('/api/trainer/my-trainer'),

  getPendingInvitations: () =>
    request<TrainerInvitation[]>('/api/trainer/pending-invitations'),

  getClientWorkouts: (clientId: string) =>
    request<ClientDataResponse<ApiWorkout>>(`/api/trainer/clients/${clientId}/workouts`),

  addClientWorkout: (clientId: string, data: Omit<ApiWorkout, 'id'>) =>
    request<ApiWorkout>(`/api/trainer/clients/${clientId}/workouts`, { method: 'POST', body: data }),

  updateClientWorkout: (clientId: string, workoutId: string, updates: Record<string, unknown>) =>
    request<ApiWorkout>(`/api/trainer/clients/${clientId}/workouts/${workoutId}`, { method: 'PATCH', body: updates }),

  deleteClientWorkout: (clientId: string, workoutId: string) =>
    request<void>(`/api/trainer/clients/${clientId}/workouts/${workoutId}`, { method: 'DELETE' }),

  getClientFoodEntries: (clientId: string) =>
    request<ClientDataResponse<ApiFoodEntry>>(`/api/trainer/clients/${clientId}/food-entries`),

  addClientFoodEntry: (clientId: string, data: Omit<ApiFoodEntry, 'id'>) =>
    request<ApiFoodEntry>(`/api/trainer/clients/${clientId}/food-entries`, { method: 'POST', body: data }),

  updateClientFoodEntry: (clientId: string, entryId: string, updates: Record<string, unknown>) =>
    request<ApiFoodEntry>(`/api/trainer/clients/${clientId}/food-entries/${entryId}`, { method: 'PATCH', body: updates }),

  deleteClientFoodEntry: (clientId: string, entryId: string) =>
    request<void>(`/api/trainer/clients/${clientId}/food-entries/${entryId}`, { method: 'DELETE' }),

  getClientCheckIns: (clientId: string) =>
    request<ClientDataResponse<ApiDailyCheckIn>>(`/api/trainer/clients/${clientId}/daily-check-ins`),

  addClientCheckIn: (clientId: string, data: Omit<ApiDailyCheckIn, 'id'>) =>
    request<ApiDailyCheckIn>(`/api/trainer/clients/${clientId}/daily-check-ins`, { method: 'POST', body: data }),

  updateClientCheckIn: (clientId: string, checkInId: string, updates: Record<string, unknown>) =>
    request<ApiDailyCheckIn>(`/api/trainer/clients/${clientId}/daily-check-ins/${checkInId}`, { method: 'PATCH', body: updates }),

  deleteClientCheckIn: (clientId: string, checkInId: string) =>
    request<void>(`/api/trainer/clients/${clientId}/daily-check-ins/${checkInId}`, { method: 'DELETE' }),

  getClientGoals: (clientId: string) =>
    request<ClientDataResponse<ApiGoal>>(`/api/trainer/clients/${clientId}/goals`),

  addClientGoal: (clientId: string, data: Omit<ApiGoal, 'id' | 'createdAt'>) =>
    request<ApiGoal>(`/api/trainer/clients/${clientId}/goals`, { method: 'POST', body: data }),

  updateClientGoal: (clientId: string, goalId: string, updates: Record<string, unknown>) =>
    request<ApiGoal>(`/api/trainer/clients/${clientId}/goals/${goalId}`, { method: 'PATCH', body: updates }),

  deleteClientGoal: (clientId: string, goalId: string) =>
    request<void>(`/api/trainer/clients/${clientId}/goals/${goalId}`, { method: 'DELETE' }),

  getClientWater: (clientId: string) =>
    request<WaterEntry[]>(`/api/trainer/clients/${clientId}/water-entries`),
};

export interface WaterEntry {
  id?: string;
  date: string;
  glasses: number;
  mlTotal: number;
}
