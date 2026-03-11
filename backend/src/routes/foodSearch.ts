/**
 * Food search routes. Basic search is free; AI lookup requires Pro.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePro } from '../middleware/requirePro.js';
import { validateBody } from '../middleware/validateBody.js';
import { lookupOrCreateFoodSchema } from '../schemas/food.js';
import * as foodSearchController from '../controllers/foodSearch.js';
import * as barcodeController from '../controllers/barcode.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getPool } from '../db/index.js';
import { sendJson } from '../utils/response.js';

const router = Router();

router.get('/api/food/search', foodSearchController.search);
router.get('/api/food/barcode/:code', barcodeController.lookupBarcode);
router.post('/api/food/lookup-or-create', requireAuth, requirePro, validateBody(lookupOrCreateFoodSchema), foodSearchController.lookupOrCreate);

// Returns all foods that have an image_url set (for display in FoodCard etc.)
router.get('/api/food/images', asyncHandler(async (_req, res) => {
  const pool = getPool();
  const result = await pool.query(
    `SELECT name, image_url FROM foods WHERE image_url IS NOT NULL AND image_url != '' ORDER BY name ASC`
  );
  sendJson(res, result.rows.map(r => ({ name: r.name, imageUrl: r.image_url })));
}));

export default router;
