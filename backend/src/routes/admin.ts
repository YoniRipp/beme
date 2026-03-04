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
import { sendJson } from '../utils/response.js';
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

export default router;
