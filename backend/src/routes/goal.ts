/**
 * Goal routes.
 */
import { Router } from 'express';
import { requireAuth, resolveEffectiveUserId } from '../middleware/auth.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import { validateBody } from '../middleware/validateBody.js';
import { createGoalSchema, updateGoalSchema } from '../schemas/routeSchemas.js';
import * as goalController from '../controllers/goal.js';

const router = Router();
const withUser = [requireAuth, resolveEffectiveUserId];

router.get('/api/goals', withUser, goalController.list);
router.post('/api/goals', withUser, idempotencyMiddleware, validateBody(createGoalSchema), goalController.add);
router.patch('/api/goals/:id', withUser, validateBody(updateGoalSchema), goalController.update);
router.delete('/api/goals/:id', withUser, goalController.remove);

export default router;
