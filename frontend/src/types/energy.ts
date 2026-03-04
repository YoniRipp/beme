export interface DailyCheckIn {
  id: string;
  date: Date;
  sleepHours?: number;
}

export interface FoodEntry {
  id: string;
  date: Date;
  name: string;
  calories: number;
  protein: number; // in grams
  carbs: number; // in grams
  fats: number; // in grams
  portionAmount?: number;
  /** e.g. g, ml, egg, eggs, apple, slice, serving */
  portionUnit?: string;
  servingType?: 'bottle' | 'can' | 'glass' | 'bottle_1L' | 'bottle_1_5L' | 'bottle_2L' | 'other';
  /** Meal time range: HH:MM 24h. When set, Energy page shows time and duration. */
  startTime?: string;
  endTime?: string;
}
