/**
 * Workout routes.
 */
import { Router } from 'express';
import { requireAuth, resolveEffectiveUserId } from '../middleware/auth.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import { validateBody } from '../middleware/validateBody.js';
import { createWorkoutSchema, updateWorkoutSchema } from '../schemas/routeSchemas.js';
import * as workoutController from '../controllers/workout.js';

const router = Router();
const withUser = [requireAuth, resolveEffectiveUserId];

router.get('/api/workouts', withUser, workoutController.list);
router.post('/api/workouts', withUser, idempotencyMiddleware, validateBody(createWorkoutSchema), workoutController.add);
router.patch('/api/workouts/:id', withUser, validateBody(updateWorkoutSchema), workoutController.update);
router.delete('/api/workouts/:id', withUser, workoutController.remove);

export default router;
