/**
 * Daily check-in routes.
 */
import { Router } from 'express';
import { requireAuth, resolveEffectiveUserId } from '../middleware/auth.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import { validateBody } from '../middleware/validateBody.js';
import { createCheckInSchema, updateCheckInSchema } from '../schemas/routeSchemas.js';
import * as dailyCheckInController from '../controllers/dailyCheckIn.js';

const router = Router();
const withUser = [requireAuth, resolveEffectiveUserId];

router.get('/api/daily-check-ins', withUser, dailyCheckInController.list);
router.post('/api/daily-check-ins', withUser, idempotencyMiddleware, validateBody(createCheckInSchema), dailyCheckInController.add);
router.patch('/api/daily-check-ins/:id', withUser, validateBody(updateCheckInSchema), dailyCheckInController.update);
router.delete('/api/daily-check-ins/:id', withUser, dailyCheckInController.remove);

export default router;
