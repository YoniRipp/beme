import * as dailyCheckInService from '../dailyCheckIn.js';
import * as weightModel from '../../models/weight.js';
import * as waterModel from '../../models/water.js';
import * as cycleModel from '../../models/cycle.js';
import * as profileModel from '../../models/profile.js';
import { resolveCheckIn, resolveWeightEntry, resolveCycleEntry } from './resolvers.js';
import { parseDate, type VoiceAction, type ExecuteResult } from './types.js';

export async function handleLogSleep(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const dateStr = parseDate(action.date);
  const existing = await resolveCheckIn(userId, dateStr);
  const hours = Number(action.sleepHours) || 0;
  if (existing) {
    await dailyCheckInService.update(userId, existing.id as string, { sleepHours: hours });
  } else {
    await dailyCheckInService.create(userId, { date: dateStr, sleepHours: hours });
  }
  return { intent: 'log_sleep', success: true, message: `Logged ${hours} hours of sleep` };
}

export async function handleEditCheckIn(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  if (!action.date) return { intent: 'edit_check_in', success: false, message: 'Date required' };
  const existing = await resolveCheckIn(userId, parseDate(action.date));
  if (!existing) return { intent: 'edit_check_in', success: false, message: 'Check-in not found' };
  await dailyCheckInService.update(userId, existing.id as string, { sleepHours: Number(action.sleepHours) || 0 });
  return { intent: 'edit_check_in', success: true, message: 'Updated sleep log' };
}

export async function handleDeleteCheckIn(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  if (!action.date) return { intent: 'delete_check_in', success: false, message: 'Date required' };
  const existing = await resolveCheckIn(userId, parseDate(action.date));
  if (!existing) return { intent: 'delete_check_in', success: false, message: 'Check-in not found' };
  await dailyCheckInService.remove(userId, existing.id as string);
  return { intent: 'delete_check_in', success: true, message: 'Deleted sleep log' };
}

export async function handleLogWeight(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const dateStr = parseDate(action.date);
  const weightKg = Number(action.weightKg) || 0;
  await weightModel.create({ userId, date: dateStr, weight: weightKg, notes: action.notes as string });
  return { intent: 'log_weight', success: true, message: `Logged weight: ${weightKg} kg` };
}

export async function handleEditWeight(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const entry = await resolveWeightEntry(userId, action);
  if (!entry) return { intent: 'edit_weight', success: false, message: 'Weight entry not found' };
  await weightModel.update(entry.id, userId, {
    weight: action.weightKg != null ? Number(action.weightKg) : undefined,
    date: action.date ? parseDate(action.date) : undefined,
    notes: action.notes as string | undefined,
  });
  return { intent: 'edit_weight', success: true, message: 'Updated weight entry' };
}

export async function handleDeleteWeight(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const entry = await resolveWeightEntry(userId, action);
  if (!entry) return { intent: 'delete_weight', success: false, message: 'Weight entry not found' };
  await weightModel.deleteById(entry.id, userId);
  return { intent: 'delete_weight', success: true, message: 'Deleted weight entry' };
}

export async function handleAddWater(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const dateStr = parseDate(action.date);
  const glasses = Number(action.glasses) || 1;
  for (let i = 0; i < glasses; i++) {
    await waterModel.addGlass(userId, dateStr);
  }
  return { intent: 'add_water', success: true, message: `Added ${glasses} glass${glasses > 1 ? 'es' : ''} of water` };
}

export async function handleRemoveWater(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const dateStr = parseDate(action.date);
  await waterModel.removeGlass(userId, dateStr);
  return { intent: 'remove_water', success: true, message: 'Removed a glass of water' };
}

export async function handleLogCycle(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const dateStr = parseDate(action.date);
  const symptoms = action.symptoms ? String(action.symptoms).split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  await cycleModel.create({
    userId,
    date: dateStr,
    periodStart: action.periodStart === true,
    flow: action.flow as string | undefined,
    symptoms,
    notes: action.notes as string | undefined,
  });
  return { intent: 'log_cycle', success: true, message: 'Logged cycle entry' };
}

export async function handleEditCycle(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const entry = await resolveCycleEntry(userId, action);
  if (!entry) return { intent: 'edit_cycle', success: false, message: 'Cycle entry not found' };
  const updates: Record<string, unknown> = {};
  if (action.periodStart != null) updates.periodStart = action.periodStart === true;
  if (action.flow != null) updates.flow = action.flow as string;
  if (action.symptoms != null) updates.symptoms = String(action.symptoms).split(',').map((s: string) => s.trim()).filter(Boolean);
  if (action.notes != null) updates.notes = action.notes as string;
  if (action.date) updates.date = parseDate(action.date);
  await cycleModel.update(entry.id, userId, updates as Parameters<typeof cycleModel.update>[2]);
  return { intent: 'edit_cycle', success: true, message: 'Updated cycle entry' };
}

export async function handleDeleteCycle(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const entry = await resolveCycleEntry(userId, action);
  if (!entry) return { intent: 'delete_cycle', success: false, message: 'Cycle entry not found' };
  await cycleModel.deleteById(entry.id, userId);
  return { intent: 'delete_cycle', success: true, message: 'Deleted cycle entry' };
}

export async function handleUpdateProfile(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  await profileModel.upsert({
    userId,
    heightCm: action.heightCm != null ? Number(action.heightCm) : undefined,
    currentWeight: action.currentWeight != null ? Number(action.currentWeight) : undefined,
    targetWeight: action.targetWeight != null ? Number(action.targetWeight) : undefined,
    activityLevel: action.activityLevel as string | undefined,
    sex: action.sex as string | undefined,
  });
  return { intent: 'update_profile', success: true, message: 'Updated profile' };
}
