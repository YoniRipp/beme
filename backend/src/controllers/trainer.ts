/**
 * Trainer controller -- thin HTTP handlers for trainer management and client data access.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import * as trainerService from '../services/trainer.js';
import * as workoutService from '../services/workout.js';
import * as foodEntryService from '../services/foodEntry.js';
import * as dailyCheckInService from '../services/dailyCheckIn.js';
import * as goalService from '../services/goal.js';
import { sendJson, sendCreated, sendNoContent, sendPaginated } from '../utils/response.js';
import { paginationSchema } from '../schemas/routeSchemas.js';

// ─── Trainer management endpoints ──────────────────────────

export const listClients = asyncHandler(async (req: Request, res: Response) => {
  const trainerId = req.user!.id;
  const clients = await trainerService.listClients(trainerId);
  sendJson(res, clients);
});

export const inviteByEmail = asyncHandler(async (req: Request, res: Response) => {
  const trainerId = req.user!.id;
  const { email } = req.body as { email: string };
  const invitation = await trainerService.inviteByEmail(trainerId, email);
  sendCreated(res, invitation);
});

export const generateInviteCode = asyncHandler(async (req: Request, res: Response) => {
  const trainerId = req.user!.id;
  const invitation = await trainerService.generateInviteCode(trainerId);
  sendCreated(res, invitation);
});

export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  const clientId = req.user!.id;
  const { inviteCode } = req.body as { inviteCode: string };
  const result = await trainerService.acceptInvitation(clientId, inviteCode);
  sendJson(res, result);
});

export const removeClient = asyncHandler(async (req: Request, res: Response) => {
  const trainerId = req.user!.id;
  const { clientId } = req.params;
  await trainerService.removeClient(trainerId, clientId);
  sendNoContent(res);
});

export const listInvitations = asyncHandler(async (req: Request, res: Response) => {
  const trainerId = req.user!.id;
  const invitations = await trainerService.listInvitations(trainerId);
  sendJson(res, invitations);
});

export const getMyTrainer = asyncHandler(async (req: Request, res: Response) => {
  const clientId = req.user!.id;
  const trainer = await trainerService.getMyTrainer(clientId);
  sendJson(res, trainer);
});

export const getPendingInvitations = asyncHandler(async (req: Request, res: Response) => {
  const email = req.user!.email;
  const invitations = await trainerService.getPendingInvitations(email);
  sendJson(res, invitations);
});

// ─── Client data endpoints (workouts) ──────────────────────

export const listClientWorkouts = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const { limit, offset } = paginationSchema.parse(req.query ?? {});
  const { data, total } = await workoutService.list(userId, { limit, offset });
  sendPaginated(res, data, total, limit, offset);
});

export const addClientWorkout = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await workoutService.create(userId, req.body);
  sendCreated(res, item);
});

export const updateClientWorkout = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await workoutService.update(userId, req.params.id as string, req.body);
  sendJson(res, item);
});

export const removeClientWorkout = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  await workoutService.remove(userId, req.params.id as string);
  sendNoContent(res);
});

// ─── Client data endpoints (food entries) ──────────────────

export const listClientFoodEntries = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const { limit, offset } = paginationSchema.parse(req.query ?? {});
  const { data, total } = await foodEntryService.list(userId, { limit, offset });
  sendPaginated(res, data, total, limit, offset);
});

export const addClientFoodEntry = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await foodEntryService.create(userId, req.body);
  sendCreated(res, item);
});

export const updateClientFoodEntry = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await foodEntryService.update(userId, req.params.id as string, req.body);
  sendJson(res, item);
});

export const removeClientFoodEntry = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  await foodEntryService.remove(userId, req.params.id as string);
  sendNoContent(res);
});

// ─── Client data endpoints (daily check-ins) ───────────────

export const listClientCheckIns = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const { limit, offset } = paginationSchema.parse(req.query ?? {});
  const { data, total } = await dailyCheckInService.list(userId, { limit, offset });
  sendPaginated(res, data, total, limit, offset);
});

export const addClientCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await dailyCheckInService.create(userId, req.body);
  sendCreated(res, item);
});

export const updateClientCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await dailyCheckInService.update(userId, req.params.id as string, req.body);
  sendJson(res, item);
});

// ─── Client data endpoints (goals) ─────────────────────────

export const listClientGoals = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const { limit, offset } = paginationSchema.parse(req.query ?? {});
  const { data, total } = await goalService.list(userId, { limit, offset });
  sendPaginated(res, data, total, limit, offset);
});

export const addClientGoal = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await goalService.create(userId, req.body);
  sendCreated(res, item);
});

export const updateClientGoal = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const item = await goalService.update(userId, req.params.id as string, req.body);
  sendJson(res, item);
});

export const removeClientGoal = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  await goalService.remove(userId, req.params.id as string);
  sendNoContent(res);
});
