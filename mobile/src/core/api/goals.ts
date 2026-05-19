import { request } from './client';
import type { PaginatedResponse } from '../../types/api';

export interface ApiGoal {
  id: string;
  type: string;
  target: number;
  period: string;
  createdAt: string;
}

export const goalsApi = {
  list: () => request<PaginatedResponse<ApiGoal>>('/api/goals'),
  add: (goal: { type: string; target: number; period: string }) =>
    request<ApiGoal>('/api/goals', { method: 'POST', body: goal }),
  update: (id: string, updates: Partial<{ type: string; target: number; period: string }>) =>
    request<ApiGoal>(`/api/goals/${id}`, { method: 'PATCH', body: updates }),
  delete: (id: string) => request<void>(`/api/goals/${id}`, { method: 'DELETE' }),
};
