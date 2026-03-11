/**
 * Public exercise catalog routes — returns exercises for display and autocomplete.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPool } from '../db/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendJson } from '../utils/response.js';
import { escapeLike } from '../utils/escapeLike.js';

const router = Router();

router.get('/api/exercises', requireAuth, asyncHandler(async (req, res) => {
  const pool = getPool();
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const muscleGroup = typeof req.query.muscleGroup === 'string' ? req.query.muscleGroup.trim() : '';

  let query = `SELECT id, name, muscle_group, category, image_url, video_url FROM exercises`;
  const conditions: string[] = [];
  const params: string[] = [];

  if (q) {
    params.push(`%${escapeLike(q)}%`);
    conditions.push(`name ILIKE $${params.length}`);
  }
  if (muscleGroup) {
    params.push(muscleGroup);
    conditions.push(`muscle_group = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ` ORDER BY name ASC`;

  const result = await pool.query(query, params);
  sendJson(res, result.rows.map(r => ({
    id: r.id,
    name: r.name,
    muscleGroup: r.muscle_group,
    category: r.category,
    imageUrl: r.image_url,
    videoUrl: r.video_url,
  })));
}));

router.get('/api/exercises/:id', requireAuth, asyncHandler(async (req, res) => {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, name, muscle_group, category, image_url, video_url FROM exercises WHERE id = $1`,
    [req.params.id],
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Exercise not found' });
  }
  const r = result.rows[0];
  sendJson(res, {
    id: r.id,
    name: r.name,
    muscleGroup: r.muscle_group,
    category: r.category,
    imageUrl: r.image_url,
    videoUrl: r.video_url,
  });
}));

export default router;
