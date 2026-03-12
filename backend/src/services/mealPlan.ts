/**
 * Meal plan service — business logic.
 * Trusts Zod-validated input from route layer.
 */
import { NotFoundError, ValidationError } from '../errors.js';
import * as mealPlanModel from '../models/mealPlan.js';
import * as foodEntryModel from '../models/foodEntry.js';
import * as foodSearch from '../models/foodSearch.js';
import type { MealPlanTemplate, MealType } from '../types/domain.js';
import type { CreateMealPlanBody, UpdateMealPlanBody } from '../schemas/routeSchemas.js';

const DEFAULT_TIMES: Record<MealType, string> = {
  Breakfast: '08:00',
  Lunch: '12:00',
  Snack: '15:00',
  Dinner: '19:00',
};

export async function list(userId: string): Promise<MealPlanTemplate[]> {
  return mealPlanModel.findByUserId(userId);
}

export async function getById(userId: string, id: string): Promise<MealPlanTemplate> {
  if (!id) throw new ValidationError('id is required');
  const template = await mealPlanModel.findById(id, userId);
  if (!template) throw new NotFoundError('Meal plan not found');
  return template;
}

export async function create(userId: string, body: CreateMealPlanBody): Promise<MealPlanTemplate> {
  return mealPlanModel.create({
    userId,
    name: body.name,
    description: body.description ?? undefined,
    items: body.items.map((item, i) => ({
      mealType: item.mealType,
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
      portionAmount: item.portionAmount ?? undefined,
      portionUnit: item.portionUnit ?? undefined,
      startTime: item.startTime ?? undefined,
      sortOrder: item.sortOrder ?? i,
    })),
  });
}

export async function update(userId: string, id: string, body: UpdateMealPlanBody): Promise<MealPlanTemplate> {
  if (!id) throw new ValidationError('id is required');
  const updated = await mealPlanModel.update(id, userId, {
    name: body.name,
    description: body.description ?? undefined,
    items: body.items?.map((item, i) => ({
      mealType: item.mealType,
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
      portionAmount: item.portionAmount ?? undefined,
      portionUnit: item.portionUnit ?? undefined,
      startTime: item.startTime ?? undefined,
      sortOrder: item.sortOrder ?? i,
    })),
  });
  if (!updated) throw new NotFoundError('Meal plan not found');
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  if (!id) throw new ValidationError('id is required');
  const deleted = await mealPlanModel.deleteById(id, userId);
  if (!deleted) throw new NotFoundError('Meal plan not found');
}

export async function applyToDay(userId: string, id: string, date: string) {
  const template = await getById(userId, id);
  const entries = [];

  for (const item of template.items) {
    const entry = await foodEntryModel.create({
      userId,
      date,
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
      portionAmount: item.portionAmount,
      portionUnit: item.portionUnit,
      startTime: item.startTime ?? DEFAULT_TIMES[item.mealType],
    });
    entries.push(entry);
  }

  return entries;
}

export async function lookupNutrition(names: string[]) {
  const results: Record<string, { calories: number; protein: number; carbs: number; fat: number; referenceGrams?: number } | null> = {};

  for (const name of names) {
    const searchResults = await foodSearch.search(name, 1);
    if (searchResults.length > 0) {
      const match = searchResults[0];
      results[name] = {
        calories: match.calories,
        protein: match.protein,
        carbs: match.carbs,
        fat: match.fat,
        referenceGrams: match.referenceGrams,
      };
    } else {
      results[name] = null;
    }
  }

  return results;
}
