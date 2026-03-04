import { DailyCheckIn, FoodEntry } from '../../types/energy';
import { parseLocalDateString } from '../../lib/dateRanges';

export function apiCheckInToDailyCheckIn(a: {
  id: string;
  date: string;
  sleepHours?: number;
}): DailyCheckIn {
  return {
    id: a.id,
    date: parseLocalDateString(a.date),
    sleepHours: a.sleepHours != null ? a.sleepHours : undefined,
  };
}

export function apiFoodEntryToFoodEntry(a: {
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
}): FoodEntry {
  return {
    id: a.id,
    date: parseLocalDateString(a.date),
    name: a.name,
    calories: a.calories,
    protein: a.protein,
    carbs: a.carbs,
    fats: a.fats,
    portionAmount: a.portionAmount,
    portionUnit: a.portionUnit,
    servingType: a.servingType as FoodEntry['servingType'],
  };
}
