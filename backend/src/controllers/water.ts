/**
 * Water entry controller — thin HTTP handlers.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import * as waterModel from '../models/water.js';
import { sendJson } from '../utils/response.js';
import { parseOptionalPagination } from '../utils/pagination.js';
import { parseQuery } from '../utils/validation.js';
import { dateWindowQuerySchema } from '../schemas/routeSchemas.js';

export const getToday = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const entry = await waterModel.findByUserAndDate(userId, date);
  sendJson(res, entry ?? { glasses: 0, mlTotal: 0, date });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  // Validated rather than cast. These reach Postgres as `$n::date`, so a malformed bound used to
  // surface as an unhandled pg error -- rendered by `errorHandler` as a 500 INTERNAL_ERROR, which
  // tells the caller the server broke when in fact they sent `?startDate=lastweek`.
  const { startDate, endDate } = parseQuery(dateWindowQuerySchema, req.query);
  const entries = await waterModel.findByUserId(userId, startDate, endDate, parseOptionalPagination(req.query));
  sendJson(res, entries);
});

export const upsert = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const entry = await waterModel.upsert({ userId, ...req.body });
  sendJson(res, entry);
});

export const addGlass = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const date = (req.body.date as string) || new Date().toISOString().split('T')[0];
  const entry = await waterModel.addGlass(userId, date);
  sendJson(res, entry);
});

export const removeGlass = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const date = (req.body.date as string) || new Date().toISOString().split('T')[0];
  const entry = await waterModel.removeGlass(userId, date);
  sendJson(res, entry);
});
