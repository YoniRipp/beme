/**
 * Daily check-in service — business logic with typed interfaces.
 * Trusts Zod-validated input from route layer.
 */
import { NotFoundError, ValidationError } from '../errors.js';
import * as dailyCheckInModel from '../models/dailyCheckIn.js';
import { publishEvent } from '../events/publish.js';
import type { DailyCheckIn, UpdateCheckInInput, PaginationParams } from '../types/domain.js';
import type { CreateCheckInBody, UpdateCheckInBody } from '../schemas/routeSchemas.js';

export async function list(userId: string, pagination?: PaginationParams) {
  return dailyCheckInModel.findByUserId(userId, pagination);
}

export async function create(userId: string, body: CreateCheckInBody): Promise<DailyCheckIn> {
  const checkIn = await dailyCheckInModel.create({
    userId,
    date: body.date,
    sleepHours: body.sleepHours,
  });
  await publishEvent('energy.CheckInCreated', checkIn , userId);
  return checkIn;
}

export async function update(userId: string, id: string, body: UpdateCheckInBody): Promise<DailyCheckIn> {
  if (!id) throw new ValidationError('id is required');
  const updates: UpdateCheckInInput = {};
  if (body.date !== undefined) updates.date = body.date;
  if (body.sleepHours !== undefined) updates.sleepHours = body.sleepHours;

  const updated = await dailyCheckInModel.update(id, userId, updates);
  if (!updated) throw new NotFoundError('Daily check-in not found');
  await publishEvent('energy.CheckInUpdated', updated , userId);
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  if (!id) throw new ValidationError('id is required');
  const deleted = await dailyCheckInModel.deleteById(id, userId);
  if (!deleted) throw new NotFoundError('Daily check-in not found');
  await publishEvent('energy.CheckInDeleted', { id }, userId);
}
