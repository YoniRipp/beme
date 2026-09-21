/**
 * Weight entry model — typed data access layer.
 */
import pg from 'pg';
import { getPool } from '../db/pool.js';
import { toDateString } from '../utils/date.js';
import { buildUpdateQuery, type UpdateBuilder } from '../db/queryBuilder.js';
import type { WeightEntry, CreateWeightEntryInput, UpdateWeightEntryInput, PaginationParams } from '../types/domain.js';

const RETURNING = 'id, date, weight, notes, unit';

function rowToEntry(row: Record<string, unknown>): WeightEntry {
  return {
    id: row.id as string,
    date: toDateString(row.date),
    weight: Number(row.weight),
    notes: (row.notes as string) ?? undefined,
    // NULL on every row written before tagging; readers take that as kilograms.
    unit: (row.unit as 'kg' | 'lbs' | null) ?? undefined,
  };
}

const UPDATE_SPEC: UpdateBuilder<UpdateWeightEntryInput> = {
  columns: {
    date: { column: 'date', cast: '::date' },
    weight: { column: 'weight' },
    notes: { column: 'notes' },
    unit: { column: 'unit' },
  },
};

export async function findByUserId(userId: string, startDate?: string, endDate?: string, pagination?: PaginationParams, client?: pg.Pool | pg.PoolClient): Promise<WeightEntry[]> {
  const db = client ?? getPool();
  let sql = 'SELECT ' + RETURNING + ' FROM weight_entries WHERE user_id = $1';
  const params: unknown[] = [userId];
  let idx = 2;

  if (startDate) {
    sql += ` AND date >= $${idx}::date`;
    params.push(startDate);
    idx++;
  }
  if (endDate) {
    sql += ` AND date <= $${idx}::date`;
    params.push(endDate);
    idx++;
  }

  sql += ' ORDER BY date DESC';
  if (pagination) {
    sql += ` LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(pagination.limit, pagination.offset);
  }
  const result = await db.query(sql, params);
  return result.rows.map(rowToEntry);
}

/** Find one weight entry by id. Targeted query. */
export async function findById(id: string, userId: string, client?: pg.Pool | pg.PoolClient): Promise<WeightEntry | null> {
  const db = client ?? getPool();
  const r = await db.query(`SELECT ${RETURNING} FROM weight_entries WHERE id = $1 AND user_id = $2 LIMIT 1`, [id, userId]);
  return r.rows[0] ? rowToEntry(r.rows[0]) : null;
}

/** Find the weight entry for a date. Targeted query. */
export async function findByDate(userId: string, date: string, client?: pg.Pool | pg.PoolClient): Promise<WeightEntry | null> {
  const db = client ?? getPool();
  const r = await db.query(`SELECT ${RETURNING} FROM weight_entries WHERE user_id = $1 AND date = $2::date ORDER BY date DESC LIMIT 1`, [userId, date]);
  return r.rows[0] ? rowToEntry(r.rows[0]) : null;
}

/** Find the most recent weight entry. Targeted query. */
export async function findLatest(userId: string, client?: pg.Pool | pg.PoolClient): Promise<WeightEntry | null> {
  const db = client ?? getPool();
  const r = await db.query(`SELECT ${RETURNING} FROM weight_entries WHERE user_id = $1 ORDER BY date DESC LIMIT 1`, [userId]);
  return r.rows[0] ? rowToEntry(r.rows[0]) : null;
}

export async function create(input: CreateWeightEntryInput, client?: pg.Pool | pg.PoolClient): Promise<WeightEntry> {
  const db = client ?? getPool();
  const result = await db.query(
    `INSERT INTO weight_entries (user_id, date, weight, notes, unit)
     VALUES ($1, $2::date, $3, $4, $5)
     ON CONFLICT (user_id, date)
     DO UPDATE SET weight = $3, notes = $4, unit = $5
     RETURNING ${RETURNING}`,
    [input.userId, input.date, input.weight, input.notes ?? null, input.unit ?? null],
  );
  return rowToEntry(result.rows[0]);
}

export async function update(id: string, userId: string, updates: UpdateWeightEntryInput, client?: pg.Pool | pg.PoolClient): Promise<WeightEntry | null> {
  const db = client ?? getPool();
  const query = buildUpdateQuery('weight_entries', 'id', 'user_id', RETURNING, UPDATE_SPEC, updates, id, userId);
  if (!query) return null;
  const result = await db.query(query.sql, query.params);
  return (result.rowCount ?? 0) > 0 ? rowToEntry(result.rows[0]) : null;
}

export async function deleteById(id: string, userId: string, client?: pg.Pool | pg.PoolClient): Promise<boolean> {
  const db = client ?? getPool();
  const result = await db.query('DELETE FROM weight_entries WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
  return (result.rowCount ?? 0) > 0;
}
