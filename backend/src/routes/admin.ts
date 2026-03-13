/**
 * Admin routes — logs, activity, user search (require admin).
 */
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getPool } from '../db/index.js';
import * as appLog from '../services/appLog.js';
import * as userActivityLog from '../models/userActivityLog.js';
import * as adminStatsService from '../services/adminStats.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendJson, sendError } from '../utils/response.js';
import { escapeLike } from '../utils/escapeLike.js';

const router = Router();

function rowToUser(row: Record<string, any>) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
  };
}

router.get('/api/admin/logs', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const level = req.query.level === 'error' ? 'error' : 'action';
    const logs = await appLog.listLogs(level);
    res.json({ logs });
  } catch (e) {
    next(e);
  }
});

router.get('/api/admin/activity', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { limit, before, from, to, userId, eventType } = req.query ?? {};
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to (ISO UTC) are required' });
    }
    const result = await userActivityLog.listActivity({
      limit: limit ? parseInt(String(limit), 10) : undefined,
      before: typeof before === 'string' ? before : undefined,
      from: String(from),
      to: String(to),
      userId: typeof userId === 'string' ? userId : undefined,
      eventType: typeof eventType === 'string' ? eventType : undefined,
    });
    res.json(result);
  } catch (e: unknown) {
    if (e instanceof Error && (e.message?.includes('required') || e.message?.includes('range') || e.message?.includes('exceed'))) {
      return res.status(400).json({ error: e.message });
    }
    next(e);
  }
});

router.get('/api/admin/users/search', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = Math.min(Math.max(1, parseInt(String(req.query.limit ?? 20), 10) || 20), 100);
    if (!q || q.length < 1) {
      return res.json([]);
    }
    const pool = getPool();
    const pattern = `%${escapeLike(q)}%`;
    const result = await pool.query(
      `SELECT id, email, name, role, created_at FROM users
       WHERE email ILIKE $1 OR name ILIKE $1
       ORDER BY name ASC
       LIMIT $2`,
      [pattern, limit]
    );
    res.json(result.rows.map(rowToUser));
  } catch (e) {
    next(e);
  }
});

router.get('/api/admin/stats', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const stats = await adminStatsService.getAll();
  sendJson(res, stats);
}));

// ─── Exercise Catalog Management ────────────────────────────────────────────

router.get('/api/admin/exercises', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, name, muscle_group, category, image_url, video_url, created_at, updated_at FROM exercises ORDER BY name ASC`
  );
  sendJson(res, result.rows.map(r => ({
    id: r.id,
    name: r.name,
    muscleGroup: r.muscle_group,
    category: r.category,
    imageUrl: r.image_url,
    videoUrl: r.video_url,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })));
}));

router.post('/api/admin/exercises', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pool = getPool();
  const { name, muscleGroup, category, imageUrl, videoUrl } = req.body ?? {};
  if (!name || typeof name !== 'string') {
    return sendError(res, 400, 'name is required');
  }
  const result = await pool.query(
    `INSERT INTO exercises (name, muscle_group, category, image_url, video_url, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (name) DO UPDATE SET
       muscle_group = COALESCE(EXCLUDED.muscle_group, exercises.muscle_group),
       category = COALESCE(EXCLUDED.category, exercises.category),
       image_url = COALESCE(EXCLUDED.image_url, exercises.image_url),
       video_url = COALESCE(EXCLUDED.video_url, exercises.video_url),
       updated_at = now()
     RETURNING id, name, muscle_group, category, image_url, video_url, created_at, updated_at`,
    [name.trim(), muscleGroup || null, category || null, imageUrl || null, videoUrl || null, req.user!.id],
  );
  const r = result.rows[0];
  sendJson(res, {
    id: r.id,
    name: r.name,
    muscleGroup: r.muscle_group,
    category: r.category,
    imageUrl: r.image_url,
    videoUrl: r.video_url,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}));

router.patch('/api/admin/exercises/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pool = getPool();
  const { name, muscleGroup, category, imageUrl, videoUrl } = req.body ?? {};
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name); }
  if (muscleGroup !== undefined) { sets.push(`muscle_group = $${idx++}`); params.push(muscleGroup || null); }
  if (category !== undefined) { sets.push(`category = $${idx++}`); params.push(category || null); }
  if (imageUrl !== undefined) { sets.push(`image_url = $${idx++}`); params.push(imageUrl || null); }
  if (videoUrl !== undefined) { sets.push(`video_url = $${idx++}`); params.push(videoUrl || null); }

  if (sets.length === 0) return sendError(res, 400, 'No fields to update');

  sets.push(`updated_at = now()`);
  params.push(req.params.id);

  const result = await pool.query(
    `UPDATE exercises SET ${sets.join(', ')} WHERE id = $${idx}
     RETURNING id, name, muscle_group, category, image_url, video_url, created_at, updated_at`,
    params,
  );
  if (result.rows.length === 0) return sendError(res, 404, 'Exercise not found');
  const r = result.rows[0];
  sendJson(res, {
    id: r.id,
    name: r.name,
    muscleGroup: r.muscle_group,
    category: r.category,
    imageUrl: r.image_url,
    videoUrl: r.video_url,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}));

router.delete('/api/admin/exercises/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pool = getPool();
  await pool.query(`DELETE FROM exercises WHERE id = $1`, [req.params.id]);
  sendJson(res, { success: true });
}));

// ─── Admin Food Search (with image_url) ─────────────────────────────────────

router.get('/api/admin/foods/search', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = Math.min(Math.max(1, parseInt(String(req.query.limit ?? 50), 10) || 50), 100);
  if (!q || q.length < 2) return sendJson(res, []);
  const pool = getPool();
  const pattern = `%${escapeLike(q)}%`;
  const result = await pool.query(
    `SELECT id, name, image_url FROM foods
     WHERE name ILIKE $1
     ORDER BY name ASC
     LIMIT $2`,
    [pattern, limit],
  );
  sendJson(res, result.rows.map(r => ({ id: r.id, name: r.name, imageUrl: r.image_url })));
}));

// ─── Food Image Management ──────────────────────────────────────────────────

router.patch('/api/admin/foods/:id/image', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pool = getPool();
  const { imageUrl } = req.body ?? {};
  if (!imageUrl || typeof imageUrl !== 'string') {
    return sendError(res, 400, 'imageUrl is required');
  }
  const result = await pool.query(
    `UPDATE foods SET image_url = $1 WHERE id = $2 RETURNING id, name, image_url`,
    [imageUrl.trim(), req.params.id],
  );
  if (result.rows.length === 0) return sendError(res, 404, 'Food not found');
  const r = result.rows[0];
  sendJson(res, { id: r.id, name: r.name, imageUrl: r.image_url });
}));

router.delete('/api/admin/foods/:id/image', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pool = getPool();
  const result = await pool.query(
    'UPDATE foods SET image_url = NULL WHERE id = $1 RETURNING id, name',
    [req.params.id]
  );
  if (result.rowCount === 0) return sendError(res, 404, 'Food not found');
  sendJson(res, { success: true });
}));

// ─── Gemini Food Review ──────────────────────────────────────────────────────

router.get('/api/admin/foods/gemini', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pool = getPool();
  const status = req.query.status === 'verified' ? 'verified'
    : req.query.status === 'unverified' ? 'unverified' : 'all';
  const limit = Math.min(Math.max(1, parseInt(String(req.query.limit ?? 50), 10) || 50), 200);
  const offset = Math.max(0, parseInt(String(req.query.offset ?? 0), 10) || 0);

  let whereClause = `source = 'gemini'`;
  if (status === 'verified') whereClause += ` AND verified = true`;
  else if (status === 'unverified') whereClause += ` AND verified = false`;

  const countResult = await pool.query(`SELECT COUNT(*) FROM foods WHERE ${whereClause}`);

  const result = await pool.query(
    `SELECT id, name, calories, protein, carbs, fat, is_liquid, image_url, verified, verified_at, created_at
     FROM foods WHERE ${whereClause}
     ORDER BY verified ASC, created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  sendJson(res, {
    foods: result.rows.map((r: Record<string, any>) => ({
      id: r.id, name: r.name, calories: Number(r.calories),
      protein: Number(r.protein), carbs: Number(r.carbs), fat: Number(r.fat),
      isLiquid: r.is_liquid, imageUrl: r.image_url,
      verified: r.verified, verifiedAt: r.verified_at, createdAt: r.created_at,
    })),
    total: parseInt(countResult.rows[0].count, 10),
  });
}));

router.patch('/api/admin/foods/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pool = getPool();
  const { name, calories, protein, carbs, fat, verified } = req.body ?? {};
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name); sets.push(`common_name = $${idx++}`); params.push(name); }
  if (calories !== undefined) { sets.push(`calories = $${idx++}`); params.push(calories); }
  if (protein !== undefined) { sets.push(`protein = $${idx++}`); params.push(protein); }
  if (carbs !== undefined) { sets.push(`carbs = $${idx++}`); params.push(carbs); }
  if (fat !== undefined) { sets.push(`fat = $${idx++}`); params.push(fat); }
  if (verified === true) {
    sets.push(`verified = true`);
    sets.push(`verified_at = now()`);
    sets.push(`verified_by = $${idx++}`);
    params.push(req.user!.id);
  }

  if (sets.length === 0) return sendError(res, 400, 'No fields to update');
  params.push(req.params.id);

  const result = await pool.query(
    `UPDATE foods SET ${sets.join(', ')}
     WHERE id = $${idx}
     RETURNING id, name, calories, protein, carbs, fat, is_liquid, image_url, verified, verified_at, created_at`,
    params,
  );
  if (result.rows.length === 0) return sendError(res, 404, 'Food not found');
  const r = result.rows[0];
  sendJson(res, {
    id: r.id, name: r.name, calories: Number(r.calories),
    protein: Number(r.protein), carbs: Number(r.carbs), fat: Number(r.fat),
    isLiquid: r.is_liquid, imageUrl: r.image_url,
    verified: r.verified, verifiedAt: r.verified_at, createdAt: r.created_at,
  });
}));

router.delete('/api/admin/foods/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pool = getPool();
  await pool.query('DELETE FROM foods WHERE id = $1', [req.params.id]);
  sendJson(res, { success: true });
}));

export default router;
