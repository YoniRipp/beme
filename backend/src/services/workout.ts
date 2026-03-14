/**
 * Workout service — business logic with typed interfaces.
 * Trusts Zod-validated input from route layer.
 */
import { NotFoundError, ValidationError } from '../errors.js';
import * as workoutModel from '../models/workout.js';
import { publishEvent } from '../events/publish.js';
import { upsertEmbedding, buildEmbeddingText, deleteEmbedding } from './embeddings.js';
import type { Workout, UpdateWorkoutInput, PaginationParams } from '../types/domain.js';
import type { CreateWorkoutBody, UpdateWorkoutBody } from '../schemas/routeSchemas.js';

export async function list(userId: string, pagination?: PaginationParams) {
  return workoutModel.findByUserId(userId, pagination);
}

export async function create(userId: string, body: CreateWorkoutBody): Promise<Workout> {
  const workout = await workoutModel.create({
    userId,
    date: body.date,
    title: body.title,
    type: body.type,
    durationMinutes: body.durationMinutes,
    exercises: body.exercises,
    notes: body.notes ?? undefined,
  });
  await publishEvent('body.WorkoutCreated', workout , userId);
  upsertEmbedding(userId, 'workout', workout.id, buildEmbeddingText('workout', workout ));
  return workout;
}

export async function update(userId: string, id: string, body: UpdateWorkoutBody): Promise<Workout> {
  if (!id) throw new ValidationError('id is required');
  const updates: UpdateWorkoutInput = {};
  if (body.date !== undefined) updates.date = body.date;
  if (body.title !== undefined) updates.title = body.title;
  if (body.type !== undefined) updates.type = body.type;
  if (body.durationMinutes !== undefined) updates.durationMinutes = body.durationMinutes;
  if (body.exercises !== undefined) updates.exercises = body.exercises;
  if (body.notes !== undefined) updates.notes = body.notes ?? undefined;

  const updated = await workoutModel.update(id, userId, updates);
  if (!updated) throw new NotFoundError('Workout not found');
  await publishEvent('body.WorkoutUpdated', updated , userId);
  upsertEmbedding(userId, 'workout', updated.id, buildEmbeddingText('workout', updated ));
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  if (!id) throw new ValidationError('id is required');
  const deleted = await workoutModel.deleteById(id, userId);
  if (!deleted) throw new NotFoundError('Workout not found');
  await publishEvent('body.WorkoutDeleted', { id }, userId);
  deleteEmbedding(id, 'workout');
}
