/**
 * Admin routes — logs, activity, user search, and user data management (require admin).
 */
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getPool } from '../db/index.js';
import * as appLog from '../services/appLog.js';
import * as userActivityLog from '../models/userActivityLog.js';
import * as adminStatsService from '../services/adminStats.js';
import * as workoutService from '../services/workout.js';
import * as foodEntryService from '../services/foodEntry.js';
import * as dailyCheckInService from '../services/dailyCheckIn.js';
import * as goalService from '../services/goal.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateBody } from '../middleware/validateBody.js';
import { sendJson, sendError, sendCreated, sendNoContent, sendPaginated } from '../utils/response.js';
import { escapeLike } from '../utils/escapeLike.js';
import {
  paginationSchema,
  createWorkoutSchema,
  updateWorkoutSchema,
  createFoodEntrySchema,
  updateFoodEntrySchema,
  createCheckInSchema,
  updateCheckInSchema,
  createGoalSchema,
  updateGoalSchema,
} from '../schemas/routeSchemas.js';

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

// ─── Admin User Data Management ─────────────────────────────────────────────
// Allows admin to view and manage any user's data (workouts, food, check-ins, goals)

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const userDataRouter = Router({ mergeParams: true });
userDataRouter.use(requireAuth, requireAdmin, (req, res, next) => {
  const { userId } = req.params;
  if (!userId || !UUID_REGEX.test(userId)) {
    return sendError(res, 400, 'Invalid user ID format');
  }
  next();
});

// Workouts
userDataRouter.get('/workouts', asyncHandler(async (req, res) => {
  const { limit, offset } = paginationSchema.parse(req.query ?? {});
  const { data, total } = await workoutService.list(req.params.userId, { limit, offset });
  sendPaginated(res, data, total, limit, offset);
}));
userDataRouter.post('/workouts', validateBody(createWorkoutSchema), asyncHandler(async (req, res) => {
  const item = await workoutService.create(req.params.userId, req.body);
  sendCreated(res, item);
}));
userDataRouter.patch('/workouts/:id', validateBody(updateWorkoutSchema), asyncHandler(async (req, res) => {
  const item = await workoutService.update(req.params.userId, req.params.id, req.body);
  sendJson(res, item);
}));
userDataRouter.delete('/workouts/:id', asyncHandler(async (req, res) => {
  await workoutService.remove(req.params.userId, req.params.id);
  sendNoContent(res);
}));

// Food entries
userDataRouter.get('/food-entries', asyncHandler(async (req, res) => {
  const { limit, offset } = paginationSchema.parse(req.query ?? {});
  const { data, total } = await foodEntryService.list(req.params.userId, { limit, offset });
  sendPaginated(res, data, total, limit, offset);
}));
userDataRouter.post('/food-entries', validateBody(createFoodEntrySchema), asyncHandler(async (req, res) => {
  const item = await foodEntryService.create(req.params.userId, req.body);
  sendCreated(res, item);
}));
userDataRouter.patch('/food-entries/:id', validateBody(updateFoodEntrySchema), asyncHandler(async (req, res) => {
  const item = await foodEntryService.update(req.params.userId, req.params.id, req.body);
  sendJson(res, item);
}));
userDataRouter.delete('/food-entries/:id', asyncHandler(async (req, res) => {
  await foodEntryService.remove(req.params.userId, req.params.id);
  sendNoContent(res);
}));

// Daily check-ins
userDataRouter.get('/daily-check-ins', asyncHandler(async (req, res) => {
  const { limit, offset } = paginationSchema.parse(req.query ?? {});
  const { data, total } = await dailyCheckInService.list(req.params.userId, { limit, offset });
  sendPaginated(res, data, total, limit, offset);
}));
userDataRouter.post('/daily-check-ins', validateBody(createCheckInSchema), asyncHandler(async (req, res) => {
  const item = await dailyCheckInService.create(req.params.userId, req.body);
  sendCreated(res, item);
}));
userDataRouter.patch('/daily-check-ins/:id', validateBody(updateCheckInSchema), asyncHandler(async (req, res) => {
  const item = await dailyCheckInService.update(req.params.userId, req.params.id, req.body);
  sendJson(res, item);
}));

// Goals
userDataRouter.get('/goals', asyncHandler(async (req, res) => {
  const { limit, offset } = paginationSchema.parse(req.query ?? {});
  const { data, total } = await goalService.list(req.params.userId, { limit, offset });
  sendPaginated(res, data, total, limit, offset);
}));
userDataRouter.post('/goals', validateBody(createGoalSchema), asyncHandler(async (req, res) => {
  const item = await goalService.create(req.params.userId, req.body);
  sendCreated(res, item);
}));
userDataRouter.patch('/goals/:id', validateBody(updateGoalSchema), asyncHandler(async (req, res) => {
  const item = await goalService.update(req.params.userId, req.params.id, req.body);
  sendJson(res, item);
}));
userDataRouter.delete('/goals/:id', asyncHandler(async (req, res) => {
  await goalService.remove(req.params.userId, req.params.id);
  sendNoContent(res);
}));

router.use('/api/admin/users/:userId', userDataRouter);

export default router;
