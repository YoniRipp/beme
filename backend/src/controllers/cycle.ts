/**
 * Cycle entry controller — thin HTTP handlers.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import * as cycleModel from '../models/cycle.js';
import { sendJson, sendCreated, sendNoContent } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../errors.js';
import { parseQuery } from '../utils/validation.js';
import { dateWindowQuerySchema } from '../schemas/routeSchemas.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  // Validated rather than cast. These reach Postgres as `$n::date`, so a malformed bound used to
  // surface as an unhandled pg error -- rendered by `errorHandler` as a 500 INTERNAL_ERROR, which
  // tells the caller the server broke when in fact they sent `?startDate=lastweek`.
  const { startDate, endDate } = parseQuery(dateWindowQuerySchema, req.query);
  const entries = await cycleModel.findByUserId(userId, startDate, endDate);
  sendJson(res, entries);
});

export const add = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const entry = await cycleModel.create({ userId, ...req.body });
  sendCreated(res, entry);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const id = req.params.id as string;
  if (!id) throw new ValidationError('id is required');
  const entry = await cycleModel.update(id, userId, req.body);
  if (!entry) throw new NotFoundError('Cycle entry not found');
  sendJson(res, entry);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const id = req.params.id as string;
  if (!id) throw new ValidationError('id is required');
  const deleted = await cycleModel.deleteById(id, userId);
  if (!deleted) throw new NotFoundError('Cycle entry not found');
  sendNoContent(res);
});
