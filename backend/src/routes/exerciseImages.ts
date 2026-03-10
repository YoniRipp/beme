/**
 * Public exercise-images route — returns all exercise images for display.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPool } from '../db/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendJson } from '../utils/response.js';

const router = Router();

router.get('/api/exercise-images', requireAuth, asyncHandler(async (_req, res) => {
  const pool = getPool();
  const result = await pool.query(`SELECT name, image_url FROM exercise_images ORDER BY name ASC`);
  sendJson(res, result.rows.map(r => ({ name: r.name, imageUrl: r.image_url })));
}));

export default router;
