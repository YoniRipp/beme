/**
 * Food search controller. No auth required.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';
import { getPool } from '../db/index.js';
import { getRedisClient } from '../redis/client.js';
import * as foodSearchModel from '../models/foodSearch.js';
import * as openFoodFacts from '../services/openFoodFacts.js';
import { lookupAndCreateFood } from '../services/foodLookupGemini.js';
import { sendJson } from '../utils/response.js';
import { sendError } from '../utils/response.js';
import { logger } from '../lib/logger.js';

const FOOD_SEARCH_CACHE_TTL_SEC = 3600;

export const search = asyncHandler(async (req: Request, res: Response) => {
  if (!config.isDbConfigured) {
    return res.status(503).json({ error: 'Food search is not configured (missing DATABASE_URL)' });
  }
  const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
  const limit = Math.min(Math.max(1, parseInt(req.query?.limit as string, 10) || 10), 25);
  if (!q) {
    return sendJson(res, []);
  }

  if (config.isRedisConfigured) {
    const redis = await getRedisClient();
    if (redis) {
      const cacheKey = `food:search:${encodeURIComponent(q)}:${limit}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return sendJson(res, JSON.parse(cached));
      }
    }
  }

  let results = await foodSearchModel.search(q, limit);

  // Supplement with OFF API results when local DB has fewer than requested
  if (results.length < limit) {
    try {
      const offResults = await openFoodFacts.searchByName(q, limit - results.length);
      const pool = getPool();
      for (const offFood of offResults) {
        // Skip if we already have a result with the same name
        if (results.some((r) => r.name.toLowerCase() === offFood.name.toLowerCase())) continue;
        // Auto-cache to local DB
        const cached = await foodSearchModel.cacheFood(pool, offFood);
        results.push(cached);
        if (results.length >= limit) break;
      }
    } catch (e) {
      logger.warn({ err: e, q }, 'OFF search supplement failed');
    }
  }

  if (config.isRedisConfigured) {
    const redis = await getRedisClient();
    if (redis) {
      const cacheKey = `food:search:${encodeURIComponent(q)}:${limit}`;
      await redis.setEx(cacheKey, FOOD_SEARCH_CACHE_TTL_SEC, JSON.stringify(results));
    }
  }

  sendJson(res, results);
});

export const lookupOrCreate = asyncHandler(async (req: Request, res: Response) => {
  if (!config.isDbConfigured) {
    return sendError(res, 503, 'Food lookup is not configured (missing DATABASE_URL)');
  }
  if (!config.geminiApiKey) {
    return sendError(res, 503, 'Gemini is not configured (missing GEMINI_API_KEY)');
  }
  const { name, liquid } = req.body;
  const pool = getPool();
  const row = await lookupAndCreateFood(pool, name, { liquidHint: liquid });
  if (!row) {
    return sendError(res, 422, 'Could not look up or create food');
  }
  const payload = {
    id: row.id,
    name: row.name,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    referenceGrams: 100,
    isLiquid: row.is_liquid,
    servingSizesMl: row.serving_sizes_ml ?? null,
  };
  sendJson(res, payload);
});
