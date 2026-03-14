/**
 * Food entry service — business logic with typed interfaces.
 * Trusts Zod-validated input from route layer.
 */
import { NotFoundError, ValidationError } from '../errors.js';
import * as foodEntryModel from '../models/foodEntry.js';
import { publishEvent } from '../events/publish.js';
import { upsertEmbedding, buildEmbeddingText, deleteEmbedding } from './embeddings.js';
import { logger } from '../lib/logger.js';
import type { FoodEntry, UpdateFoodEntryInput, PaginationParams } from '../types/domain.js';
import type { CreateFoodEntryBody, UpdateFoodEntryBody } from '../schemas/routeSchemas.js';

export async function list(userId: string, pagination?: PaginationParams) {
  return foodEntryModel.findByUserId(userId, pagination);
}

export async function create(userId: string, body: CreateFoodEntryBody): Promise<FoodEntry> {
  const entry = await foodEntryModel.create({
    userId,
    date: body.date,
    name: body.name,
    calories: body.calories,
    protein: body.protein,
    carbs: body.carbs,
    fats: body.fats,
    portionAmount: body.portionAmount ?? undefined,
    portionUnit: body.portionUnit ?? undefined,
    servingType: body.servingType ?? undefined,
    startTime: body.startTime ?? undefined,
    endTime: body.endTime ?? undefined,
  });
  await publishEvent('energy.FoodEntryCreated', entry , userId);
  upsertEmbedding(userId, 'food_entry', entry.id, buildEmbeddingText('food_entry', entry ))
    .catch((err) => logger.warn({ err, entryId: entry.id }, 'Failed to upsert food entry embedding'));
  return entry;
}

export async function update(userId: string, id: string, body: UpdateFoodEntryBody): Promise<FoodEntry> {
  if (!id) throw new ValidationError('id is required');
  const updates: UpdateFoodEntryInput = {};
  if (body.date !== undefined) updates.date = body.date;
  if (body.name !== undefined) updates.name = body.name;
  if (body.calories !== undefined) updates.calories = body.calories;
  if (body.protein !== undefined) updates.protein = body.protein;
  if (body.carbs !== undefined) updates.carbs = body.carbs;
  if (body.fats !== undefined) updates.fats = body.fats;
  if (body.portionAmount !== undefined) updates.portionAmount = body.portionAmount ?? undefined;
  if (body.portionUnit !== undefined) updates.portionUnit = body.portionUnit ?? undefined;
  if (body.servingType !== undefined) updates.servingType = body.servingType ?? undefined;
  if (body.startTime !== undefined) updates.startTime = body.startTime ?? undefined;
  if (body.endTime !== undefined) updates.endTime = body.endTime ?? undefined;

  const updated = await foodEntryModel.update(id, userId, updates);
  if (!updated) throw new NotFoundError('Food entry not found');
  await publishEvent('energy.FoodEntryUpdated', updated , userId);
  upsertEmbedding(userId, 'food_entry', updated.id, buildEmbeddingText('food_entry', updated ))
    .catch((err) => logger.warn({ err, entryId: updated.id }, 'Failed to upsert food entry embedding'));
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  if (!id) throw new ValidationError('id is required');
  const deleted = await foodEntryModel.deleteById(id, userId);
  if (!deleted) throw new NotFoundError('Food entry not found');
  await publishEvent('energy.FoodEntryDeleted', { id }, userId);
  deleteEmbedding(id, 'food_entry')
    .catch((err) => logger.warn({ err, entryId: id }, 'Failed to delete food entry embedding'));
}
