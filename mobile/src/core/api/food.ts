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

  /**
   * Fetch every daily check-in, following pagination (bounded — see pagination.ts's MAX_PAGES).
   * Used by views that need the complete dataset. A view that genuinely wants a single
   * page should call `list()` directly instead.
   */
  listAll: async (): Promise<ApiDailyCheckIn[]> => {
    const result = await requestAllPages<ApiDailyCheckIn>('/api/daily-check-ins');
    return result.data;
  },

  add: (c: { date?: string; sleepHours?: number }) =>
    request<ApiDailyCheckIn>('/api/daily-check-ins', { method: 'POST', body: c }),
  update: (id: string, updates: Partial<Omit<ApiDailyCheckIn, 'id'>>) =>
    request<ApiDailyCheckIn>(`/api/daily-check-ins/${id}`, { method: 'PATCH', body: updates }),
  delete: (id: string) => request<void>(`/api/daily-check-ins/${id}`, { method: 'DELETE' }),
};

/**
 * A row from `/api/food/search`. Mirrors `rowToResult` in
 * `backend/src/models/foodSearch.ts` and the web client's own type in
 * `frontend/src/core/api/food.ts` — the server has always sent `defaultUnit`,
 * `unitWeightGrams`, `preparation` and `imageUrl`; this type used to hide them, which
 * is why the entry form could not tell a drink or an egg from a per-100g solid.
 */
export interface FoodSearchResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Quantity the macros above are published against. Not always 100. */
  referenceGrams?: number;
  isLiquid?: boolean;
  servingSizesMl?: { can?: number; bottle?: number; glass?: number } | null;
  preparation?: string;
  /** The food's own countable unit — 'egg', 'slice', 'drumstick' — when it has one. */
  defaultUnit?: string | null;
  /** Grams in one `defaultUnit`. */
  unitWeightGrams?: number | null;
  imageUrl?: string | null;
}

export function searchFoods(query: string, limit = 10): Promise<FoodSearchResult[]> {
  const q = encodeURIComponent(query.trim());
  if (!q) return Promise.resolve([]);
  return request<FoodSearchResult[]>(`/api/food/search?q=${q}&limit=${Math.min(limit, 25)}`);
}
