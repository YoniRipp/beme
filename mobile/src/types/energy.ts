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
  protein: number;
  carbs: number;
  fats: number;
  portionAmount?: number;
  portionUnit?: string;
  servingType?: 'bottle' | 'can' | 'glass' | 'bottle_1L' | 'bottle_1_5L' | 'bottle_2L' | 'other';
  startTime?: string;
  endTime?: string;
}
