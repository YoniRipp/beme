export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface MealPlanItem {
  id?: string;
  mealType: MealType;
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

export interface MealPlanTemplate {
  id: string;
  name: string;
  description?: string;
  items: MealPlanItem[];
  createdAt: string;
  updatedAt: string;
}
