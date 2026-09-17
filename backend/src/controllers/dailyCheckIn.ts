/**
 * Daily check-in controller — thin HTTP handlers.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import * as dailyCheckInService from '../services/dailyCheckIn.js';
import { sendJson, sendCreated, sendNoContent, sendPaginated } from '../utils/response.js';
import { listRangeQuerySchema } from '../schemas/routeSchemas.js';
import { parseQuery } from '../utils/validation.js';

/**
 * Paged list, newest first. `startDate`/`endDate` are optional and narrow it to
 * an inclusive calendar-day window; `total` (and therefore `hasMore`) reflects
 * the same window, so a client can page a filtered list to its end.
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const { limit, offset, startDate, endDate } = parseQuery(listRangeQuerySchema, req.query);
  const { data, total } = await dailyCheckInService.list(userId, { limit, offset }, { startDate, endDate });
  sendPaginated(res, data, total, limit, offset);
});

export const add = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await dailyCheckInService.create(userId, req.body);
  sendCreated(res, item);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await dailyCheckInService.update(userId, req.params.id as string, req.body);
  sendJson(res, item);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  await dailyCheckInService.remove(userId, req.params.id as string);
  sendNoContent(res);
});
