/**
 * Food entry controller — thin HTTP handlers.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import * as foodEntryService from '../services/foodEntry.js';
import { sendJson, sendCreated, sendNoContent, sendPaginated } from '../utils/response.js';
import { paginationSchema } from '../schemas/routeSchemas.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const { limit, offset } = paginationSchema.parse(req.query ?? {});
  const { data, total } = await foodEntryService.list(userId, { limit, offset });
  sendPaginated(res, data, total, limit, offset);
});

export const add = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await foodEntryService.create(userId, req.body);
  sendCreated(res, item);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await foodEntryService.update(userId, req.params.id as string, req.body);
  sendJson(res, item);
});

export const addBatch = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const items = await foodEntryService.createBatch(userId, req.body);
  sendCreated(res, items);
});

export const duplicateDay = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const items = await foodEntryService.duplicateDay(userId, req.body.sourceDate, req.body.targetDate);
  sendCreated(res, items);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  await foodEntryService.remove(userId, req.params.id as string);
  sendNoContent(res);
});
