/**
 * Daily check-in service.
 */
import { parseDate, validateNonNegative } from '../utils/validation.js';
import { requireId, requireFound, buildUpdates } from '../utils/serviceHelpers.js';
import * as dailyCheckInModel from '../models/dailyCheckIn.js';
import { publishEvent } from '../events/publish.js';

function normSleepHours(v: unknown) {
  if (v == null) return null;
  return validateNonNegative(v, 'sleepHours');
}

export async function list(userId: string) {
  return dailyCheckInModel.findByUserId(userId);
}

export async function create(userId: string, body: Record<string, unknown>) {
  const { date, sleepHours } = body ?? {};
  const checkIn = await dailyCheckInModel.create({
    userId,
    date: parseDate(date),
    sleepHours: normSleepHours(sleepHours),
  });
  await publishEvent('energy.CheckInCreated', checkIn, userId);
  return checkIn;
}

export async function update(userId: string, id: string, body: Record<string, unknown>) {
  requireId(id);
  const updates = buildUpdates(body ?? {}, {
    date: (v: unknown) => v,
    sleepHours: normSleepHours,
  });
  const updated = await dailyCheckInModel.update(id, userId, updates);
  requireFound(updated, 'Daily check-in');
  await publishEvent('energy.CheckInUpdated', updated, userId);
  return updated;
}

export async function remove(userId: string, id: string) {
  requireId(id);
  const deleted = await dailyCheckInModel.deleteById(id, userId);
  requireFound(deleted, 'Daily check-in');
  await publishEvent('energy.CheckInDeleted', { id }, userId);
}
