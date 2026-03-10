/**
 * Profile routes.
 */
import { Router } from 'express';
import { withUser } from './helpers.js';
import { validateBody } from '../middleware/validateBody.js';
import { upsertProfileSchema } from '../schemas/routeSchemas.js';
import * as profileController from '../controllers/profile.js';

const router = Router();

router.get('/api/profile', withUser, profileController.get);
router.put('/api/profile', withUser, validateBody(upsertProfileSchema), profileController.upsert);

export default router;
