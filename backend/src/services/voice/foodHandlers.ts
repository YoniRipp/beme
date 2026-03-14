import * as foodEntryService from '../foodEntry.js';
import { resolveFoodEntry, resolveClientId } from './resolvers.js';
import { parseDate, type VoiceAction, type ExecuteResult } from './types.js';

export async function handleAddFood(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  await foodEntryService.create(userId, {
    date: parseDate(action.date),
    name: (action.name as string) ?? 'Unknown',
    calories: Number(action.calories) || 0,
    protein: Number(action.protein) || 0,
    carbs: Number(action.carbs) || 0,
    fats: Number(action.fats) || 0,
    portionAmount: action.portionAmount != null ? Number(action.portionAmount) : undefined,
    portionUnit: action.portionUnit as string,
    startTime: action.startTime as string,
    endTime: action.endTime as string,
  });
  return { intent: 'add_food', success: true, message: `Logged ${(action.name as string) ?? 'food'}${action.calories ? `, ${Number(action.calories)} cal` : ''}` };
}

export async function handleEditFood(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const e = await resolveFoodEntry(userId, action);
  if (!e) return { intent: 'edit_food_entry', success: false, message: 'Food entry not found' };
  await foodEntryService.update(userId, e.id as string, {
    name: action.name as string,
    calories: action.calories != null ? Number(action.calories) : undefined,
    protein: action.protein != null ? Number(action.protein) : undefined,
    carbs: action.carbs != null ? Number(action.carbs) : undefined,
    fats: action.fats != null ? Number(action.fats) : undefined,
    date: action.date ? parseDate(action.date) : undefined,
  });
  return { intent: 'edit_food_entry', success: true, message: 'Updated food entry' };
}

export async function handleDeleteFood(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const e = await resolveFoodEntry(userId, action);
  if (!e) return { intent: 'delete_food_entry', success: false, message: 'Food entry not found' };
  await foodEntryService.remove(userId, e.id as string);
  return { intent: 'delete_food_entry', success: true, message: 'Deleted food entry' };
}

export async function handleAddClientFood(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const clientId = await resolveClientId(userId, action);
  if (!clientId) return { intent: 'add_client_food', success: false, message: 'Client not found' };
  await foodEntryService.create(clientId, {
    date: parseDate(action.date),
    name: (action.name as string) ?? 'Unknown',
    calories: Number(action.calories) || 0,
    protein: Number(action.protein) || 0,
    carbs: Number(action.carbs) || 0,
    fats: Number(action.fats) || 0,
    portionAmount: action.portionAmount != null ? Number(action.portionAmount) : undefined,
    portionUnit: action.portionUnit as string,
  });
  return { intent: 'add_client_food', success: true, message: `Logged food for client: ${(action.name as string) ?? 'food'}` };
}

export async function handleEditClientFood(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const clientId = await resolveClientId(userId, action);
  if (!clientId) return { intent: 'edit_client_food', success: false, message: 'Client not found' };
  const e = await resolveFoodEntry(clientId, action);
  if (!e) return { intent: 'edit_client_food', success: false, message: 'Client food entry not found' };
  await foodEntryService.update(clientId, e.id as string, {
    name: action.name as string,
    calories: action.calories != null ? Number(action.calories) : undefined,
    protein: action.protein != null ? Number(action.protein) : undefined,
    carbs: action.carbs != null ? Number(action.carbs) : undefined,
    fats: action.fats != null ? Number(action.fats) : undefined,
  });
  return { intent: 'edit_client_food', success: true, message: 'Updated client food entry' };
}

export async function handleDeleteClientFood(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const clientId = await resolveClientId(userId, action);
  if (!clientId) return { intent: 'delete_client_food', success: false, message: 'Client not found' };
  const e = await resolveFoodEntry(clientId, action);
  if (!e) return { intent: 'delete_client_food', success: false, message: 'Client food entry not found' };
  await foodEntryService.remove(clientId, e.id as string);
  return { intent: 'delete_client_food', success: true, message: 'Deleted client food entry' };
}
