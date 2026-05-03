import { request } from './client';

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
    request<ClientDataResponse>(`/api/trainer/clients/${clientId}/workouts`),

  getClientFoodEntries: (clientId: string) =>
    request<ClientDataResponse>(`/api/trainer/clients/${clientId}/food-entries`),

  getClientCheckIns: (clientId: string) =>
    request<ClientDataResponse>(`/api/trainer/clients/${clientId}/daily-check-ins`),

  getClientGoals: (clientId: string) =>
    request<ClientDataResponse>(`/api/trainer/clients/${clientId}/goals`),

  getClientWater: (clientId: string) =>
    request<WaterEntry[]>(`/api/trainer/clients/${clientId}/water-entries`),

  addClientWorkout: (clientId: string, body: object) =>
    request<Record<string,unknown>>(`/api/trainer/clients/${clientId}/workouts`, { method: 'POST', body }),
  updateClientWorkout: (clientId: string, workoutId: string, body: object) =>
    request<Record<string,unknown>>(`/api/trainer/clients/${clientId}/workouts/${workoutId}`, { method: 'PATCH', body }),
  removeClientWorkout: (clientId: string, workoutId: string) =>
    request<void>(`/api/trainer/clients/${clientId}/workouts/${workoutId}`, { method: 'DELETE' }),

  addClientFoodEntry: (clientId: string, body: object) =>
    request<Record<string,unknown>>(`/api/trainer/clients/${clientId}/food-entries`, { method: 'POST', body }),
  updateClientFoodEntry: (clientId: string, entryId: string, body: object) =>
    request<Record<string,unknown>>(`/api/trainer/clients/${clientId}/food-entries/${entryId}`, { method: 'PATCH', body }),
  removeClientFoodEntry: (clientId: string, entryId: string) =>
    request<void>(`/api/trainer/clients/${clientId}/food-entries/${entryId}`, { method: 'DELETE' }),

  addClientCheckIn: (clientId: string, body: object) =>
    request<Record<string,unknown>>(`/api/trainer/clients/${clientId}/daily-check-ins`, { method: 'POST', body }),
  updateClientCheckIn: (clientId: string, checkInId: string, body: object) =>
    request<Record<string,unknown>>(`/api/trainer/clients/${clientId}/daily-check-ins/${checkInId}`, { method: 'PATCH', body }),

  addClientGoal: (clientId: string, body: object) =>
    request<Record<string,unknown>>(`/api/trainer/clients/${clientId}/goals`, { method: 'POST', body }),
  updateClientGoal: (clientId: string, goalId: string, body: object) =>
    request<Record<string,unknown>>(`/api/trainer/clients/${clientId}/goals/${goalId}`, { method: 'PATCH', body }),
  removeClientGoal: (clientId: string, goalId: string) =>
    request<void>(`/api/trainer/clients/${clientId}/goals/${goalId}`, { method: 'DELETE' }),
};

export interface WaterEntry {
  id?: string;
  date: string;
  glasses: number;
  mlTotal: number;
}
