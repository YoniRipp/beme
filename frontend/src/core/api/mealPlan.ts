import { request } from './client';
import type { MealPlanItem } from '@/types/mealPlan';

export interface ApiMealPlanTemplate {
  id: string;
  name: string;
  description?: string;
  items: ApiMealPlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiMealPlanItem {
  id: string;
  mealType: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portionAmount?: number;
  portionUnit?: string;
  startTime?: string;
  sortOrder: number;
}

export interface NutritionLookupResult {
  [name: string]: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    referenceGrams?: number;
  } | null;
}

export const mealPlanApi = {
  list: () => request<ApiMealPlanTemplate[]>('/api/meal-plans'),
  getById: (id: string) => request<ApiMealPlanTemplate>(`/api/meal-plans/${id}`),
  create: (data: {
    name: string;
    description?: string;
    items: Omit<MealPlanItem, 'id'>[];
  }) => request<ApiMealPlanTemplate>('/api/meal-plans', { method: 'POST', body: data }),
  update: (id: string, data: {
    name?: string;
    description?: string;
    items?: Omit<MealPlanItem, 'id'>[];
  }) => request<ApiMealPlanTemplate>(`/api/meal-plans/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => request<void>(`/api/meal-plans/${id}`, { method: 'DELETE' }),
  applyToDay: (id: string, date: string) =>
    request<unknown[]>(`/api/meal-plans/${id}/apply`, { method: 'POST', body: { date } }),
  lookupNutrition: (names: string[]) =>
    request<NutritionLookupResult>('/api/meal-plans/lookup', { method: 'POST', body: { names } }),
};
