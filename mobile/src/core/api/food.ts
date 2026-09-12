import { request } from './client';
import { requestAllPages } from './pagination';
import type { MealType, PaginatedResponse } from '../../types/api';

export interface ApiFoodEntry {
  id: string;
  date: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portionAmount?: number;
  portionUnit?: string;
  servingType?: string;
  startTime?: string;
  endTime?: string;
  mealType?: MealType;
}

const DEFAULT_LIST_LIMIT = 200;

export const foodApi = {
  list: (params: { limit?: number; offset?: number } = {}) => {
    const limit = params.limit ?? DEFAULT_LIST_LIMIT;
    const offset = params.offset ?? 0;
    return request<PaginatedResponse<ApiFoodEntry>>(
      `/api/food-entries?limit=${limit}&offset=${offset}`,
    );
  },

  /**
   * Fetch every food entry, following pagination (bounded — see pagination.ts's MAX_PAGES).
   * Used by totals and trend views that need the complete dataset. A view that genuinely
   * wants a single page should call `list()` directly instead.
   */
  listAll: async (): Promise<ApiFoodEntry[]> => {
    const result = await requestAllPages<ApiFoodEntry>('/api/food-entries');
    return result.data;
  },

  add: (e: {
    date?: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    portionAmount?: number;
    portionUnit?: string;
    servingType?: string;
    startTime?: string;
    endTime?: string;
    mealType?: MealType;
  }) => request<ApiFoodEntry>('/api/food-entries', { method: 'POST', body: e }),
  update: (id: string, updates: Partial<Omit<ApiFoodEntry, 'id'>>) =>
    request<ApiFoodEntry>(`/api/food-entries/${id}`, { method: 'PATCH', body: updates }),
  delete: (id: string) => request<void>(`/api/food-entries/${id}`, { method: 'DELETE' }),
};

export interface ApiDailyCheckIn {
  id: string;
  date: string;
  sleepHours?: number;
}

export const dailyCheckInsApi = {
  list: () => request<PaginatedResponse<ApiDailyCheckIn>>('/api/daily-check-ins'),
  add: (c: { date?: string; sleepHours?: number }) =>
    request<ApiDailyCheckIn>('/api/daily-check-ins', { method: 'POST', body: c }),
  update: (id: string, updates: Partial<Omit<ApiDailyCheckIn, 'id'>>) =>
    request<ApiDailyCheckIn>(`/api/daily-check-ins/${id}`, { method: 'PATCH', body: updates }),
  delete: (id: string) => request<void>(`/api/daily-check-ins/${id}`, { method: 'DELETE' }),
};

export interface FoodSearchResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  referenceGrams?: number;
  isLiquid?: boolean;
  servingSizesMl?: { can?: number; bottle?: number; glass?: number } | null;
}

export function searchFoods(query: string, limit = 10): Promise<FoodSearchResult[]> {
  const q = encodeURIComponent(query.trim());
  if (!q) return Promise.resolve([]);
  return request<FoodSearchResult[]>(`/api/food/search?q=${q}&limit=${Math.min(limit, 25)}`);
}
