/**
 * Water entry routes.
 */
import { Router } from 'express';
import { withUser } from './helpers.js';
import { validateBody } from '../middleware/validateBody.js';
import { upsertWaterEntrySchema } from '../schemas/routeSchemas.js';
import * as waterController from '../controllers/water.js';

const router = Router();

router.get('/api/water-entries', withUser, waterController.getToday);
router.get('/api/water-entries/history', withUser, waterController.list);
router.put('/api/water-entries', withUser, validateBody(upsertWaterEntrySchema), waterController.upsert);
router.post('/api/water-entries/add-glass', withUser, waterController.addGlass);
router.post('/api/water-entries/remove-glass', withUser, waterController.removeGlass);

export default router;
