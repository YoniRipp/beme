/**
 * Trainer routes -- management, invitations, and client data access.
 */
import { Router } from 'express';
import { requireAuth, requireTrainer, resolveTrainerClientUserId } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  createFoodEntrySchema,
  updateFoodEntrySchema,
  createCheckInSchema,
  updateCheckInSchema,
  createGoalSchema,
  updateGoalSchema,
} from '../schemas/routeSchemas.js';
import * as trainerController from '../controllers/trainer.js';

const router = Router();

// ─── Trainer management ────────────────────────────────────
router.get('/api/trainer/clients', requireAuth, requireTrainer, trainerController.listClients);
router.post('/api/trainer/invite', requireAuth, requireTrainer, trainerController.inviteByEmail);
router.post('/api/trainer/invite-code', requireAuth, requireTrainer, trainerController.generateInviteCode);
router.get('/api/trainer/invitations', requireAuth, requireTrainer, trainerController.listInvitations);
router.delete('/api/trainer/clients/:clientId', requireAuth, requireTrainer, trainerController.removeClient);

// ─── Client-facing ─────────────────────────────────────────
router.post('/api/trainer/accept-invite', requireAuth, trainerController.acceptInvitation);
router.get('/api/trainer/my-trainer', requireAuth, trainerController.getMyTrainer);
router.get('/api/trainer/pending-invitations', requireAuth, trainerController.getPendingInvitations);

// ─── Client data access (trainer reads/writes client data) ─
const clientData = Router({ mergeParams: true });
clientData.use(requireAuth, requireTrainer, resolveTrainerClientUserId as import('express').RequestHandler);

// Workouts
clientData.get('/workouts', trainerController.listClientWorkouts);
clientData.post('/workouts', validateBody(createWorkoutSchema), trainerController.addClientWorkout);
clientData.patch('/workouts/:id', validateBody(updateWorkoutSchema), trainerController.updateClientWorkout);
clientData.delete('/workouts/:id', trainerController.removeClientWorkout);

// Food entries
clientData.get('/food-entries', trainerController.listClientFoodEntries);
clientData.post('/food-entries', validateBody(createFoodEntrySchema), trainerController.addClientFoodEntry);
clientData.patch('/food-entries/:id', validateBody(updateFoodEntrySchema), trainerController.updateClientFoodEntry);
clientData.delete('/food-entries/:id', trainerController.removeClientFoodEntry);

// Daily check-ins
clientData.get('/daily-check-ins', trainerController.listClientCheckIns);
clientData.post('/daily-check-ins', validateBody(createCheckInSchema), trainerController.addClientCheckIn);
clientData.patch('/daily-check-ins/:id', validateBody(updateCheckInSchema), trainerController.updateClientCheckIn);

// Goals
clientData.get('/goals', trainerController.listClientGoals);
clientData.post('/goals', validateBody(createGoalSchema), trainerController.addClientGoal);
clientData.patch('/goals/:id', validateBody(updateGoalSchema), trainerController.updateClientGoal);
clientData.delete('/goals/:id', trainerController.removeClientGoal);

router.use('/api/trainer/clients/:clientId', clientData);

export default router;
