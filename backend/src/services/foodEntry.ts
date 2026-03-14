/**
 * Food entry service — business logic with typed interfaces.
 * Trusts Zod-validated input from route layer.
 */
import { NotFoundError, ValidationError } from '../errors.js';
import * as foodEntryModel from '../models/foodEntry.js';
import { publishEvent } from '../events/publish.js';
import { upsertEmbedding, buildEmbeddingText, deleteEmbedding } from './embeddings.js';
import type { FoodEntry, UpdateFoodEntryInput, PaginationParams } from '../types/domain.js';
import { getPool } from '../db/pool.js';
import type { CreateFoodEntryBody, UpdateFoodEntryBody, CreateFoodEntriesBatchBody } from '../schemas/routeSchemas.js';

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
  await publishEvent('energy.FoodEntryCreated', entry as unknown as Record<string, unknown>, userId);
  upsertEmbedding(userId, 'food_entry', entry.id, buildEmbeddingText('food_entry', entry as unknown as Record<string, unknown>));
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
  await publishEvent('energy.FoodEntryUpdated', updated as unknown as Record<string, unknown>, userId);
  upsertEmbedding(userId, 'food_entry', updated.id, buildEmbeddingText('food_entry', updated as unknown as Record<string, unknown>));
  return updated;
}

export async function createBatch(userId: string, body: CreateFoodEntriesBatchBody): Promise<FoodEntry[]> {
  const pool = getPool('energy');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created: FoodEntry[] = [];
    for (const item of body.entries) {
      const entry = await foodEntryModel.create({
        userId,
        date: body.date,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        portionAmount: item.portionAmount ?? undefined,
        portionUnit: item.portionUnit ?? undefined,
        servingType: item.servingType ?? undefined,
        startTime: item.startTime ?? undefined,
        endTime: item.endTime ?? undefined,
      }, client);
      created.push(entry);
    }
    await client.query('COMMIT');
    // Fire-and-forget: publish events and upsert embeddings after commit
    for (const entry of created) {
      publishEvent('energy.FoodEntryCreated', entry as unknown as Record<string, unknown>, userId);
      upsertEmbedding(userId, 'food_entry', entry.id, buildEmbeddingText('food_entry', entry as unknown as Record<string, unknown>));
    }
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function duplicateDay(userId: string, sourceDate: string, targetDate: string): Promise<FoodEntry[]> {
  const { data: sourceEntries } = await foodEntryModel.findByUserId(userId, undefined, undefined);
  const dayEntries = sourceEntries.filter((e) => e.date === sourceDate);
  if (dayEntries.length === 0) {
    throw new ValidationError('No food entries found for the source date');
  }
  return createBatch(userId, {
    date: targetDate,
    entries: dayEntries.map((e) => ({
      name: e.name,
      calories: e.calories,
      protein: e.protein,
      carbs: e.carbs,
      fats: e.fats,
      portionAmount: e.portionAmount,
      portionUnit: e.portionUnit,
      servingType: e.servingType,
      startTime: e.startTime,
      endTime: e.endTime,
    })),
  });
}

export async function remove(userId: string, id: string): Promise<void> {
  if (!id) throw new ValidationError('id is required');
  const deleted = await foodEntryModel.deleteById(id, userId);
  if (!deleted) throw new NotFoundError('Food entry not found');
  await publishEvent('energy.FoodEntryDeleted', { id }, userId);
  deleteEmbedding(id, 'food_entry');
}
