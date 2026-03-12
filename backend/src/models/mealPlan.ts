/**
 * Meal plan model — typed data access layer.
 */
import pg from 'pg';
import { getPool } from '../db/pool.js';
import type { MealPlanTemplate, MealPlanItem, CreateMealPlanInput, UpdateMealPlanInput } from '../types/domain.js';

function rowToTemplate(row: Record<string, unknown>, items: MealPlanItem[]): MealPlanTemplate {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? undefined,
    items,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToItem(row: Record<string, unknown>): MealPlanItem {
  return {
    id: row.id as string,
    mealType: row.meal_type as MealPlanItem['mealType'],
    name: row.name as string,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fats: Number(row.fats),
    portionAmount: row.portion_amount != null ? Number(row.portion_amount) : undefined,
    portionUnit: (row.portion_unit as string) ?? undefined,
    startTime: (row.start_time as string) ?? undefined,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export async function findByUserId(userId: string, client?: pg.Pool | pg.PoolClient): Promise<MealPlanTemplate[]> {
  const db = client ?? getPool('energy');

  const templatesResult = await db.query(
    'SELECT id, name, description, created_at, updated_at FROM meal_plan_templates WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId],
  );

  if (templatesResult.rows.length === 0) return [];

  const templateIds = templatesResult.rows.map((r: Record<string, unknown>) => r.id as string);
  const itemsResult = await db.query(
    'SELECT * FROM meal_plan_items WHERE template_id = ANY($1) ORDER BY sort_order ASC, created_at ASC',
    [templateIds],
  );

  const itemsByTemplate = new Map<string, MealPlanItem[]>();
  for (const row of itemsResult.rows) {
    const tid = row.template_id as string;
    if (!itemsByTemplate.has(tid)) itemsByTemplate.set(tid, []);
    itemsByTemplate.get(tid)!.push(rowToItem(row));
  }

  return templatesResult.rows.map((row: Record<string, unknown>) =>
    rowToTemplate(row, itemsByTemplate.get(row.id as string) ?? []),
  );
}

export async function findById(id: string, userId: string, client?: pg.Pool | pg.PoolClient): Promise<MealPlanTemplate | null> {
  const db = client ?? getPool('energy');

  const templateResult = await db.query(
    'SELECT id, name, description, created_at, updated_at FROM meal_plan_templates WHERE id = $1 AND user_id = $2',
    [id, userId],
  );

  if (templateResult.rows.length === 0) return null;

  const itemsResult = await db.query(
    'SELECT * FROM meal_plan_items WHERE template_id = $1 ORDER BY sort_order ASC, created_at ASC',
    [id],
  );

  return rowToTemplate(templateResult.rows[0], itemsResult.rows.map(rowToItem));
}

export async function create(input: CreateMealPlanInput, client?: pg.Pool | pg.PoolClient): Promise<MealPlanTemplate> {
  const db = client ?? getPool('energy');
  const pool = db as pg.Pool;
  const conn = 'connect' in pool ? await pool.connect() : db as pg.PoolClient;

  try {
    await conn.query('BEGIN');

    const templateResult = await conn.query(
      `INSERT INTO meal_plan_templates (user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, created_at, updated_at`,
      [input.userId, input.name.trim(), input.description ?? null],
    );

    const template = templateResult.rows[0];
    const templateId = template.id as string;

    const items: MealPlanItem[] = [];
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      const itemResult = await conn.query(
        `INSERT INTO meal_plan_items (template_id, meal_type, name, calories, protein, carbs, fats, portion_amount, portion_unit, start_time, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [templateId, item.mealType, item.name.trim(), item.calories, item.protein, item.carbs, item.fats, item.portionAmount ?? null, item.portionUnit ?? null, item.startTime ?? null, item.sortOrder ?? i],
      );
      items.push(rowToItem(itemResult.rows[0]));
    }

    await conn.query('COMMIT');
    return rowToTemplate(template, items);
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    if ('release' in conn) (conn as pg.PoolClient).release();
  }
}

export async function update(id: string, userId: string, updates: UpdateMealPlanInput, client?: pg.Pool | pg.PoolClient): Promise<MealPlanTemplate | null> {
  const db = client ?? getPool('energy');
  const pool = db as pg.Pool;
  const conn = 'connect' in pool ? await pool.connect() : db as pg.PoolClient;

  try {
    await conn.query('BEGIN');

    // Verify ownership
    const existing = await conn.query(
      'SELECT id FROM meal_plan_templates WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    if (existing.rows.length === 0) {
      await conn.query('ROLLBACK');
      return null;
    }

    // Update template fields
    const setClauses: string[] = ['updated_at = now()'];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIdx++}`);
      params.push(updates.name.trim());
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIdx++}`);
      params.push(updates.description);
    }

    params.push(id);
    const templateResult = await conn.query(
      `UPDATE meal_plan_templates SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING id, name, description, created_at, updated_at`,
      params,
    );

    // Replace items if provided
    let items: MealPlanItem[];
    if (updates.items) {
      await conn.query('DELETE FROM meal_plan_items WHERE template_id = $1', [id]);
      items = [];
      for (let i = 0; i < updates.items.length; i++) {
        const item = updates.items[i];
        const itemResult = await conn.query(
          `INSERT INTO meal_plan_items (template_id, meal_type, name, calories, protein, carbs, fats, portion_amount, portion_unit, start_time, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [id, item.mealType, item.name.trim(), item.calories, item.protein, item.carbs, item.fats, item.portionAmount ?? null, item.portionUnit ?? null, item.startTime ?? null, item.sortOrder ?? i],
        );
        items.push(rowToItem(itemResult.rows[0]));
      }
    } else {
      const itemsResult = await conn.query(
        'SELECT * FROM meal_plan_items WHERE template_id = $1 ORDER BY sort_order ASC, created_at ASC',
        [id],
      );
      items = itemsResult.rows.map(rowToItem);
    }

    await conn.query('COMMIT');
    return rowToTemplate(templateResult.rows[0], items);
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    if ('release' in conn) (conn as pg.PoolClient).release();
  }
}

export async function deleteById(id: string, userId: string, client?: pg.Pool | pg.PoolClient): Promise<boolean> {
  const db = client ?? getPool('energy');
  const result = await db.query(
    'DELETE FROM meal_plan_templates WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
