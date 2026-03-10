/**
 * Cycle entry controller — thin HTTP handlers.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import * as cycleModel from '../models/cycle.js';
import { sendJson, sendCreated, sendNoContent } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../errors.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
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
