/**
 * Meal plan controller — thin HTTP handlers.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import * as mealPlanService from '../services/mealPlan.js';
import { sendJson, sendCreated, sendNoContent } from '../utils/response.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const data = await mealPlanService.list(userId);
  sendJson(res, data);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const data = await mealPlanService.getById(userId, req.params.id as string);
  sendJson(res, data);
});

export const add = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await mealPlanService.create(userId, req.body);
  sendCreated(res, item);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await mealPlanService.update(userId, req.params.id as string, req.body);
  sendJson(res, item);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  await mealPlanService.remove(userId, req.params.id as string);
  sendNoContent(res);
});

export const applyToDay = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const entries = await mealPlanService.applyToDay(userId, req.params.id as string, req.body.date);
  sendCreated(res, entries);
});

export const lookupNutrition = asyncHandler(async (req: Request, res: Response) => {
  const results = await mealPlanService.lookupNutrition(req.body.names);
  sendJson(res, results);
});
