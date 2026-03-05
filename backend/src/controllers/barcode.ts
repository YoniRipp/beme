/**
 * Barcode lookup controller. No auth required.
 * Local DB first (indexed, <1ms), then OFF API fallback with auto-cache.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';
import { getPool } from '../db/index.js';
import * as foodSearchModel from '../models/foodSearch.js';
import * as openFoodFacts from '../services/openFoodFacts.js';
import { sendJson, sendError } from '../utils/response.js';

export const lookupBarcode = asyncHandler(async (req: Request, res: Response) => {
  if (!config.isDbConfigured) {
    return sendError(res, 503, 'Food lookup is not configured (missing DATABASE_URL)');
  }

  const barcode = String(req.params.code || '').trim();
  if (!barcode) {
    return sendError(res, 400, 'Barcode is required');
  }

  const pool = getPool();

  // 1. Check local DB (indexed, <1ms)
  const local = await foodSearchModel.getByBarcode(pool, barcode);
  if (local) {
    return sendJson(res, local);
  }

  // 2. Fallback: OFF API
  const offResult = await openFoodFacts.getByBarcode(barcode);
  if (!offResult) {
    return sendError(res, 404, 'Product not found');
  }

  // 3. Auto-cache to local DB
  const cached = await foodSearchModel.cacheFood(pool, offResult);
  sendJson(res, cached);
});
