/**
 * Barcode lookup controller. No auth required.
 * Looks up food by barcode in the local database.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';
import { getPool } from '../db/index.js';
import * as foodSearchModel from '../models/foodSearch.js';
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
  const local = await foodSearchModel.getByBarcode(pool, barcode);
  if (local) {
    return sendJson(res, local);
  }

  return sendError(res, 404, 'Product not found');
});
