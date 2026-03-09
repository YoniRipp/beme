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
};
