/**
 * AI Insights controller.
 * GET /api/insights          — monthly AI-generated insights (cached or generated)
 * GET /api/insights/today    — today's recommendations (from cache or generated)
 * POST /api/insights/refresh — force regenerate and save
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendJson, sendError } from '../utils/response.js';
import { getOrGenerateInsights, refreshInsights } from '../services/insights.js';
import { getStatsSince } from '../models/userDailyStats.js';
import { config } from '../config/index.js';

export const getInsights = asyncHandler(async (req: Request, res: Response) => {
  if (!config.geminiApiKey) {
    return sendError(res, 503, 'AI insights not configured (missing GEMINI_API_KEY)');
  }
  const { main } = await getOrGenerateInsights(req.user!.id);
  return sendJson(res, main);
});

export const refreshInsightsController = asyncHandler(async (req: Request, res: Response) => {
  if (!config.geminiApiKey) {
    return sendError(res, 503, 'AI insights not configured (missing GEMINI_API_KEY)');
  }
  const { main } = await refreshInsights(req.user!.id);
  return sendJson(res, main);
});

/** GET /api/insights/stats?days=30 — aggregated daily stats from the read-model pipeline */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(Math.max(1, parseInt(req.query.days as string, 10) || 30), 365);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const stats = await getStatsSince(req.user!.id, since.toISOString().slice(0, 10));
  return sendJson(res, { days, stats });
});

export const getTodayRecommendations = asyncHandler(async (req: Request, res: Response) => {
  if (!config.geminiApiKey) {
    return sendError(res, 503, 'AI insights not configured (missing GEMINI_API_KEY)');
  }
  const { today } = await getOrGenerateInsights(req.user!.id);
  return sendJson(res, today);
});
