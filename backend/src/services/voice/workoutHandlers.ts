import * as workoutService from '../workout.js';
import { resolveWorkout, resolveClientId } from './resolvers.js';
import { parseDate, type VoiceAction, type ExecuteResult } from './types.js';
import type { WorkoutType } from '../../types/domain.js';

export async function handleAddWorkout(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  await workoutService.create(userId, {
    date: parseDate(action.date),
    title: (action.title as string) ?? 'Workout',
    type: ((action.type as string) ?? 'cardio') as WorkoutType,
    durationMinutes: Number(action.durationMinutes) || 30,
    exercises: Array.isArray(action.exercises) ? action.exercises : [],
    notes: action.notes as string,
  });
  return { intent: 'add_workout', success: true, message: `Logged workout: ${(action.title as string) ?? 'Workout'} (${(action.type as string) ?? 'cardio'}, ${Number(action.durationMinutes) || 30} min)` };
}

export async function handleEditWorkout(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const w = await resolveWorkout(userId, action);
  if (!w) return { intent: 'edit_workout', success: false, message: 'Workout not found' };
  await workoutService.update(userId, w.id as string, {
    title: action.title as string,
    type: action.type as WorkoutType | undefined,
    durationMinutes: action.durationMinutes != null ? Number(action.durationMinutes) : undefined,
    notes: action.notes as string,
    date: action.date ? parseDate(action.date) : undefined,
    exercises: Array.isArray(action.exercises) ? action.exercises : undefined,
  });
  return { intent: 'edit_workout', success: true, message: 'Updated workout' };
}

export async function handleDeleteWorkout(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const w = await resolveWorkout(userId, action);
  if (!w) return { intent: 'delete_workout', success: false, message: 'Workout not found' };
  await workoutService.remove(userId, w.id as string);
  return { intent: 'delete_workout', success: true, message: 'Deleted workout' };
}

export async function handleAddClientWorkout(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const clientId = await resolveClientId(userId, action);
  if (!clientId) return { intent: 'add_client_workout', success: false, message: 'Client not found' };
  await workoutService.create(clientId, {
    date: parseDate(action.date),
    title: (action.title as string) ?? 'Workout',
    type: ((action.type as string) ?? 'cardio') as WorkoutType,
    durationMinutes: Number(action.durationMinutes) || 30,
    exercises: Array.isArray(action.exercises) ? action.exercises : [],
    notes: action.notes as string,
  });
  return { intent: 'add_client_workout', success: true, message: `Logged workout for client: ${(action.title as string) ?? 'Workout'}` };
}

export async function handleEditClientWorkout(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const clientId = await resolveClientId(userId, action);
  if (!clientId) return { intent: 'edit_client_workout', success: false, message: 'Client not found' };
  const w = await resolveWorkout(clientId, action);
  if (!w) return { intent: 'edit_client_workout', success: false, message: 'Client workout not found' };
  await workoutService.update(clientId, w.id as string, {
    title: action.title as string,
    type: action.type as WorkoutType | undefined,
    durationMinutes: action.durationMinutes != null ? Number(action.durationMinutes) : undefined,
    exercises: Array.isArray(action.exercises) ? action.exercises : undefined,
  });
  return { intent: 'edit_client_workout', success: true, message: 'Updated client workout' };
}

export async function handleDeleteClientWorkout(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const clientId = await resolveClientId(userId, action);
  if (!clientId) return { intent: 'delete_client_workout', success: false, message: 'Client not found' };
  const w = await resolveWorkout(clientId, action);
  if (!w) return { intent: 'delete_client_workout', success: false, message: 'Client workout not found' };
  await workoutService.remove(clientId, w.id as string);
  return { intent: 'delete_client_workout', success: true, message: 'Deleted client workout' };
}
