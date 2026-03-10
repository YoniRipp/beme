/**
 * Profile controller — thin HTTP handlers.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import * as profileModel from '../models/profile.js';
import { sendJson } from '../utils/response.js';

export const get = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const profile = await profileModel.findByUserId(userId);
  sendJson(res, profile ?? { setupCompleted: false, waterGoalGlasses: 8, cycleTrackingEnabled: false });
});

export const upsert = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const profile = await profileModel.upsert({ userId, ...req.body });
  sendJson(res, profile);
});
