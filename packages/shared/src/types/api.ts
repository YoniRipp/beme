export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Named in mobile; the web client inlined the same union in `FoodEntry.mealType`. */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
