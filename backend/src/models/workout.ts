/**
 * Workout model — typed data access layer.
 */
import pg from 'pg';
import { getPool } from '../db/pool.js';
import { buildUpdateQuery, type UpdateBuilder } from '../db/queryBuilder.js';
import type { Workout, CreateWorkoutInput, UpdateWorkoutInput, Exercise, PaginationParams, WorkoutType } from '../types/domain.js';

const RETURNING = 'id, date, title, type, duration_minutes, exercises, notes';

function rowToWorkout(row: Record<string, unknown>): Workout {
  return {
    id: row.id as string,
    date: String(row.date),
    title: row.title as string,
    type: row.type as WorkoutType,
    durationMinutes: Number(row.duration_minutes),
    exercises: (row.exercises as Exercise[]) ?? [],
    notes: (row.notes as string) ?? undefined,
  };
}

const UPDATE_SPEC: UpdateBuilder<UpdateWorkoutInput> = {
  columns: {
    date: { column: 'date', cast: '::date' },
    title: { column: 'title', transform: (v) => String(v).trim() },
    type: { column: 'type' },
    durationMinutes: { column: 'duration_minutes' },
    exercises: { column: 'exercises', cast: '::jsonb', transform: (v) => JSON.stringify(Array.isArray(v) ? v : []) },
    notes: { column: 'notes' },
  },
};

export async function findByUserId(userId: string, pagination?: PaginationParams, client?: pg.Pool | pg.PoolClient): Promise<{ data: Workout[]; total: number }> {
  const db = client ?? getPool('body');
  const countResult = await db.query('SELECT COUNT(*)::int AS total FROM workouts WHERE user_id = $1', [userId]);
  const total = countResult.rows[0].total;

  let sql = 'SELECT ' + RETURNING + ' FROM workouts WHERE user_id = $1 ORDER BY date DESC, created_at DESC';
  const params: unknown[] = [userId];

  if (pagination) {
    sql += ' LIMIT $2 OFFSET $3';
    params.push(pagination.limit, pagination.offset);
  }

  const result = await db.query(sql, params);
  return { data: result.rows.map(rowToWorkout), total };
}

export async function findById(userId: string, id: string, client?: pg.Pool | pg.PoolClient): Promise<Workout | null> {
  const db = client ?? getPool('body');
  const result = await db.query('SELECT ' + RETURNING + ' FROM workouts WHERE id = $1 AND user_id = $2', [id, userId]);
  return result.rows.length > 0 ? rowToWorkout(result.rows[0]) : null;
}

export async function findByTitle(userId: string, title: string, client?: pg.Pool | pg.PoolClient): Promise<Workout | null> {
  const db = client ?? getPool('body');
  const result = await db.query('SELECT ' + RETURNING + ' FROM workouts WHERE user_id = $1 AND LOWER(title) LIKE $2 ORDER BY date DESC LIMIT 1', [userId, `%${title.toLowerCase()}%`]);
  return result.rows.length > 0 ? rowToWorkout(result.rows[0]) : null;
}

export async function create(input: CreateWorkoutInput, client?: pg.Pool | pg.PoolClient): Promise<Workout> {
  const db = client ?? getPool('body');
  const result = await db.query(
    `INSERT INTO workouts (user_id, date, title, type, duration_minutes, exercises, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${RETURNING}`,
    [input.userId, input.date, input.title.trim(), input.type, input.durationMinutes, JSON.stringify(input.exercises), input.notes ?? null],
  );
  return rowToWorkout(result.rows[0]);
}

export async function update(id: string, userId: string, updates: UpdateWorkoutInput, client?: pg.Pool | pg.PoolClient): Promise<Workout | null> {
  const db = client ?? getPool('body');
  const query = buildUpdateQuery('workouts', 'id', 'user_id', RETURNING, UPDATE_SPEC, updates, id, userId);
  if (!query) return null;
  const result = await db.query(query.sql, query.params);
  return (result.rowCount ?? 0) > 0 ? rowToWorkout(result.rows[0]) : null;
}

export async function deleteById(id: string, userId: string, client?: pg.Pool | pg.PoolClient): Promise<boolean> {
  const db = client ?? getPool('body');
  const result = await db.query('DELETE FROM workouts WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
  return (result.rowCount ?? 0) > 0;
}
