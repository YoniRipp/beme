/**
 * Food entry model — typed data access layer.
 */
import pg from 'pg';
import { getPool } from '../db/pool.js';
import { toDateString } from '../utils/date.js';
import { buildUpdateQuery, type UpdateBuilder } from '../db/queryBuilder.js';
import { escapeLike } from '../utils/escapeLike.js';
import type { FoodEntry, CreateFoodEntryInput, UpdateFoodEntryInput, PaginationParams } from '../types/domain.js';

const RETURNING = 'id, date, name, calories, protein, carbs, fats, portion_amount, portion_unit, serving_type, start_time, end_time, meal_type';

function rowToEntry(row: Record<string, unknown>): FoodEntry {
  return {
    id: row.id as string,
    date: toDateString(row.date),
    name: row.name as string,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fats: Number(row.fats),
    portionAmount: row.portion_amount != null ? Number(row.portion_amount) : undefined,
    portionUnit: (row.portion_unit as string) ?? undefined,
    servingType: (row.serving_type as string) ?? undefined,
    startTime: (row.start_time as string) ?? undefined,
    endTime: (row.end_time as string) ?? undefined,
    mealType: (row.meal_type as FoodEntry['mealType']) ?? undefined,
  };
}

const UPDATE_SPEC: UpdateBuilder<UpdateFoodEntryInput> = {
  columns: {
    date: { column: 'date', cast: '::date' },
    name: { column: 'name', transform: (v) => String(v).trim() },
    calories: { column: 'calories' },
    protein: { column: 'protein' },
    carbs: { column: 'carbs' },
    fats: { column: 'fats' },
    portionAmount: { column: 'portion_amount' },
    portionUnit: { column: 'portion_unit' },
    servingType: { column: 'serving_type' },
    startTime: { column: 'start_time' },
    endTime: { column: 'end_time' },
    mealType: { column: 'meal_type' },
  },
};

/**
 * A user's entries, newest first, optionally narrowed to an inclusive
 * `startDate`..`endDate` window so a client does not have to read whole
 * history to render a month.
 *
 * The window is built once and used by BOTH queries: `total` feeds `hasMore`,
 * so counting the unfiltered table while returning filtered rows would make a
 * paging client walk past the end of the list forever.
 */
export async function findByUserId(userId: string, startDate?: string, endDate?: string, pagination?: PaginationParams, client?: pg.Pool | pg.PoolClient): Promise<{ data: FoodEntry[]; total: number }> {
  const db = client ?? getPool('energy');
  let where = 'user_id = $1';
  const params: unknown[] = [userId];
  let idx = 2;

  if (startDate) {
    where += ` AND date >= $${idx}::date`;
    params.push(startDate);
    idx++;
  }
  if (endDate) {
    where += ` AND date <= $${idx}::date`;
    params.push(endDate);
    idx++;
  }

  const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM food_entries WHERE ${where}`, params);
  const total = countResult.rows[0].total;

  let sql = `SELECT ${RETURNING} FROM food_entries WHERE ${where} ORDER BY date DESC, created_at DESC`;
  const rowParams = [...params];

  if (pagination) {
    sql += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    rowParams.push(pagination.limit, pagination.offset);
  }

  const result = await db.query(sql, rowParams);
  return { data: result.rows.map(rowToEntry), total };
}

export async function findByUserIdAndDate(userId: string, date: string, client?: pg.Pool | pg.PoolClient): Promise<FoodEntry[]> {
  const db = client ?? getPool('energy');
  const result = await db.query(
    `SELECT ${RETURNING}
     FROM food_entries
     WHERE user_id = $1 AND date = $2::date
     ORDER BY created_at ASC`,
    [userId, date],
  );
  return result.rows.map(rowToEntry);
}

/**
 * Find a single entry by id, or the most recent entry whose name matches
 * (case-insensitive substring). Targeted query — avoids loading the whole table.
 */
export async function findOne(userId: string, opts: { entryId?: string; name?: string }, client?: pg.Pool | pg.PoolClient): Promise<FoodEntry | null> {
  const db = client ?? getPool('energy');
  if (opts.entryId) {
    const r = await db.query(`SELECT ${RETURNING} FROM food_entries WHERE id = $1 AND user_id = $2 LIMIT 1`, [opts.entryId, userId]);
    return r.rows[0] ? rowToEntry(r.rows[0]) : null;
  }
  if (opts.name) {
    const r = await db.query(
      `SELECT ${RETURNING} FROM food_entries
       WHERE user_id = $1 AND name ILIKE $2
       ORDER BY date DESC, created_at DESC LIMIT 1`,
      [userId, `%${escapeLike(opts.name)}%`],
    );
    return r.rows[0] ? rowToEntry(r.rows[0]) : null;
  }
  return null;
}

export async function create(input: CreateFoodEntryInput, client?: pg.Pool | pg.PoolClient): Promise<FoodEntry> {
  const db = client ?? getPool('energy');
  const result = await db.query(
    `INSERT INTO food_entries (user_id, date, name, calories, protein, carbs, fats, portion_amount, portion_unit, serving_type, start_time, end_time, meal_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING ${RETURNING}`,
    [input.userId, input.date, input.name.trim(), input.calories, input.protein, input.carbs, input.fats, input.portionAmount ?? null, input.portionUnit ?? null, input.servingType ?? null, input.startTime ?? null, input.endTime ?? null, input.mealType ?? null],
  );
  return rowToEntry(result.rows[0]);
}

export async function update(id: string, userId: string, updates: UpdateFoodEntryInput, client?: pg.Pool | pg.PoolClient): Promise<FoodEntry | null> {
  const db = client ?? getPool('energy');
  const query = buildUpdateQuery('food_entries', 'id', 'user_id', RETURNING, UPDATE_SPEC, updates, id, userId);
  if (!query) return null;
  const result = await db.query(query.sql, query.params);
  return (result.rowCount ?? 0) > 0 ? rowToEntry(result.rows[0]) : null;
}

/** Returns the deleted row's date (for event payloads), or null if nothing matched. */
export async function deleteById(id: string, userId: string, client?: pg.Pool | pg.PoolClient): Promise<{ date: string } | null> {
  const db = client ?? getPool('energy');
  const result = await db.query('DELETE FROM food_entries WHERE id = $1 AND user_id = $2 RETURNING date', [id, userId]);
  const row = result.rows[0];
  if (!row) return null;
  return { date: toDateString(row.date) };
}
