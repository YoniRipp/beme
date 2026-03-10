/**
 * Cycle entry routes.
 */
import { Router } from 'express';
import { withUser } from './helpers.js';
import { validateBody } from '../middleware/validateBody.js';
import { createCycleEntrySchema, updateCycleEntrySchema } from '../schemas/routeSchemas.js';
import * as cycleController from '../controllers/cycle.js';

const router = Router();

router.get('/api/cycle-entries', withUser, cycleController.list);
router.post('/api/cycle-entries', withUser, validateBody(createCycleEntrySchema), cycleController.add);
router.patch('/api/cycle-entries/:id', withUser, validateBody(updateCycleEntrySchema), cycleController.update);
router.delete('/api/cycle-entries/:id', withUser, cycleController.remove);

export default router;
