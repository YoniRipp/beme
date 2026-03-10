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

// ─── Exercise Image Management ───────────────────────────────────────────────

router.get('/api/admin/exercise-images', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const pool = getPool();
  const result = await pool.query(`SELECT id, name, image_url, created_at FROM exercise_images ORDER BY name ASC`);
  sendJson(res, result.rows.map(r => ({ id: r.id, name: r.name, imageUrl: r.image_url, createdAt: r.created_at })));
}));

router.post('/api/admin/exercise-images', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pool = getPool();
  const { name, imageUrl } = req.body ?? {};
  if (!name || typeof name !== 'string' || !imageUrl || typeof imageUrl !== 'string') {
    return sendError(res, 400, 'name and imageUrl are required');
  }
  const result = await pool.query(
    `INSERT INTO exercise_images (name, image_url, uploaded_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE SET image_url = EXCLUDED.image_url, uploaded_by = EXCLUDED.uploaded_by
     RETURNING id, name, image_url, created_at`,
    [name.trim(), imageUrl.trim(), req.user!.id],
  );
  const r = result.rows[0];
  sendJson(res, { id: r.id, name: r.name, imageUrl: r.image_url, createdAt: r.created_at });
}));

router.delete('/api/admin/exercise-images/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const pool = getPool();
  await pool.query(`DELETE FROM exercise_images WHERE id = $1`, [req.params.id]);
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

export default router;
