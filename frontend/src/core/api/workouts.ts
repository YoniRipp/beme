import { request } from './client';
import type { PaginatedResponse } from '@/types/api';

export interface ApiWorkout {
  id: string;
  date: string;
  title: string;
  type: string;
  durationMinutes: number;
  exercises: { name: string; sets: number; reps: number; repsPerSet?: number[]; weight?: number; notes?: string }[];
  notes?: string;
  completed: boolean;
}

export const workoutsApi = {
  list: () => request<PaginatedResponse<ApiWorkout>>('/api/workouts'),
  add: (w: {
    date?: string;
    title: string;
    type: string;
    durationMinutes: number;
    exercises?: ApiWorkout['exercises'];
    notes?: string;
    completed?: boolean;
  }) => request<ApiWorkout>('/api/workouts', { method: 'POST', body: w }),
  update: (id: string, updates: Partial<Omit<ApiWorkout, 'id'>>) =>
    request<ApiWorkout>(`/api/workouts/${id}`, { method: 'PATCH', body: updates }),
  delete: (id: string) => request<void>(`/api/workouts/${id}`, { method: 'DELETE' }),
};
