/**
 * Web-side adapter over the shared food-text parser.
 *
 * The parsing itself moved to `packages/shared/src/domain/foodText.ts` because the Expo
 * client needs it — it runs on the device with the best microphone in the product and had no
 * food-parsing path at all, while `global/domain-conventions.md` calls voice "the primary path
 * for food logging". One implementation, two clients; `CLAUDE.md`'s rule.
 *
 * **Why this file still exists.** Shared parses to the canonical `MealType`
 * (`'breakfast' | …`), which is what `food_entries.meal_type` stores. This module's callers
 * use a capitalised vocabulary of the same name, and they are not the only ones: the web
 * currently has THREE meal types — this one, `features/energy/mealType.ts`'s, and
 * `FoodEntryModal`'s local `MealTypeOption` — and unifying them is a real change to untested
 * UI, not something to smuggle into a parser move. So this converts, the callers are
 * untouched, and the duplication left behind is a twenty-line named bridge rather than a
 * forked 148-line parser.
 *
 * Delete it when the web speaks one meal vocabulary.
 */
import {
  parseFoodItems as parseFoodItemsShared,
  matchMeal as matchMealShared,
  getMealStartTime as getMealStartTimeShared,
  inferMealFromTime as inferMealFromTimeShared,
  mealLabel,
  textContainsMealKeyword,
} from '@trackvibe/shared/domain';
import type { MealType as CanonicalMealType } from '@trackvibe/shared/types';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface ParsedFoodItem {
  rawText: string;
  name: string;
  amount: number | null;
  unit: string | null;
  meal: MealType;
}

const toLabel = (meal: CanonicalMealType) => mealLabel(meal) as MealType;
const toCanonical = (meal: MealType) => meal.toLowerCase() as CanonicalMealType;

export function matchMeal(text: string): MealType | null {
  const meal = matchMealShared(text);
  return meal ? toLabel(meal) : null;
}

export function parseFoodItems(text: string): ParsedFoodItem[] {
  return parseFoodItemsShared(text).map((item) => ({ ...item, meal: toLabel(item.meal) }));
}

export function getMealStartTime(meal: MealType): string {
  return getMealStartTimeShared(toCanonical(meal));
}

export function inferMealFromTime(): MealType {
  return toLabel(inferMealFromTimeShared());
}

export { textContainsMealKeyword };
