/**
 * Weight entry routes.
 */
import { Router } from 'express';
import { withUser } from './helpers.js';
import { validateBody } from '../middleware/validateBody.js';
import { createWeightEntrySchema, updateWeightEntrySchema } from '../schemas/routeSchemas.js';
import * as weightController from '../controllers/weight.js';

const router = Router();

router.get('/api/weight-entries', withUser, weightController.list);
router.post('/api/weight-entries', withUser, validateBody(createWeightEntrySchema), weightController.add);
router.patch('/api/weight-entries/:id', withUser, validateBody(updateWeightEntrySchema), weightController.update);
router.delete('/api/weight-entries/:id', withUser, weightController.remove);

export default router;
