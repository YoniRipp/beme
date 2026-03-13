/**
 * Streak controller — thin HTTP handlers.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import * as streakService from '../services/streak.js';
import { sendJson } from '../utils/response.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  try {
    const streaks = await streakService.list(userId);
    sendJson(res, streaks);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('relation') && msg.includes('does not exist')) {
      // Table not yet migrated — return empty array
      sendJson(res, []);
      return;
    }
    throw err;
  }
});
