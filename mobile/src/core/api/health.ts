import { request } from './client';

/**
 * Profile client — the macro half of the user's daily targets.
 *
 * `mobile/src/core/api/` had no health slice at all, which is the mechanical reason the
 * Expo Home could not show a protein, carb or fat target: the grams live on the profile
 * (`macro_carbs / macro_fat / macro_protein`) and this client had no way to reach them.
 * The daily calorie target is not here — it lives in the `goals` table and comes through
 * `goals.ts`, which is the store both clients now agree owns it.
 *
 * Transcribed from `frontend/src/core/api/health.ts` so the two clients share one shape.
 * Weight, water, cycle and streak clients are deliberately not part of this slice.
 */

export interface ApiProfile {
  id?: string;
  dateOfBirth?: string;
  sex?: string;
  heightCm?: number;
  currentWeight?: number;
  targetWeight?: number;
  activityLevel?: string;
  waterGoalGlasses: number;
  cycleTrackingEnabled: boolean;
  averageCycleLength?: number;
  setupCompleted: boolean;
  macroCarbs?: number;
  macroFat?: number;
  macroProtein?: number;
}

export const profileApi = {
  get: () => request<ApiProfile>('/api/profile'),
  upsert: (data: Partial<ApiProfile>) =>
    request<ApiProfile>('/api/profile', { method: 'PUT', body: data }),
};
