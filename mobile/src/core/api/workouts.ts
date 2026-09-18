import { request } from './client';
import { listAllPages, type ListAllResult } from './pagination';
import type { PaginatedResponse } from '../../types/api';

/**
 * Wire shape of one exercise, as the API actually stores and returns it.
 *
 * Keep this in step with the backend `exerciseSchema` (backend/src/schemas/routeSchemas.ts).
 * `weightPerSet` entries may be `null`: that is how the API spells a blank /
 * bodyweight set.
 */
export interface ApiExercise {
  name: string;
  sets: number;
  reps: number;
  repsPerSet?: number[];
  weightPerSet?: Array<number | null | undefined>;
  completedPerSet?: boolean[];
  weight?: number;
  notes?: string;
}

export interface ApiWorkout {
  id: string;
  date: string;
  title: string;
  type: string;
  durationMinutes: number;
  exercises: ApiExercise[];
  notes?: string;
  completed: boolean;
}

export const workoutsApi = {
  list: () => request<PaginatedResponse<ApiWorkout>>('/api/workouts'),

  /**
   * Fetch every workout, following pagination (bounded — see pagination.ts's MAX_PAGES).
   * Used by views that need the complete dataset. A view that genuinely wants a single
   * page should call `list()` directly instead.
   */
  listAll: (): Promise<ListAllResult<ApiWorkout>> =>
    listAllPages<ApiWorkout>('/api/workouts'),

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
