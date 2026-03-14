import * as workoutModel from '../../models/workout.js';
import * as foodEntryModel from '../../models/foodEntry.js';
import * as dailyCheckInModel from '../../models/dailyCheckIn.js';
import * as goalModel from '../../models/goal.js';
import * as weightModel from '../../models/weight.js';
import * as cycleModel from '../../models/cycle.js';
import * as trainerClientModel from '../../models/trainerClient.js';
import { parseDate, type VoiceAction } from './types.js';

export async function resolveWorkout(userId: string, action: VoiceAction) {
  if (action.workoutId) {
    return workoutModel.findById(userId, String(action.workoutId));
  }
  if (action.workoutTitle) {
    return workoutModel.findByTitle(userId, String(action.workoutTitle));
  }
  return null;
}

export async function resolveFoodEntry(userId: string, action: VoiceAction) {
  if (action.entryId) {
    return foodEntryModel.findById(userId, String(action.entryId));
  }
  if (action.foodName) {
    return foodEntryModel.findByName(userId, String(action.foodName));
  }
  return null;
}

export async function resolveCheckIn(userId: string, date: string) {
  const dateStr = parseDate(date);
  return dailyCheckInModel.findByDate(userId, dateStr);
}

export async function resolveGoal(userId: string, action: VoiceAction) {
  if (action.goalId) {
    return goalModel.findById(userId, String(action.goalId));
  }
  if (action.goalType) {
    return goalModel.findByType(userId, String(action.goalType));
  }
  return null;
}

export async function resolveWeightEntry(userId: string, action: VoiceAction) {
  if (action.entryId) {
    return weightModel.findById(userId, String(action.entryId));
  }
  if (action.date) {
    const dateStr = parseDate(action.date);
    return weightModel.findByDate(userId, dateStr);
  }
  const entries = await weightModel.findByUserId(userId);
  return entries[0] ?? null;
}

export async function resolveCycleEntry(userId: string, action: VoiceAction) {
  if (action.entryId) {
    return cycleModel.findById(userId, String(action.entryId));
  }
  if (action.date) {
    const dateStr = parseDate(action.date);
    return cycleModel.findByDate(userId, dateStr);
  }
  const entries = await cycleModel.findByUserId(userId);
  return entries[0] ?? null;
}

export async function resolveClientId(trainerId: string, action: VoiceAction): Promise<string | null> {
  if (action.clientId) return action.clientId as string;
  if (action.clientName) {
    const clients = await trainerClientModel.findClientsByTrainerId(trainerId);
    const lower = String(action.clientName).toLowerCase();
    const match = clients.find((c) => c.clientName.toLowerCase().includes(lower));
    return match?.clientId ?? null;
  }
  return null;
}
