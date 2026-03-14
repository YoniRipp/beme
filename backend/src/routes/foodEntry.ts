/**
 * Food entry routes.
 */
import { Router } from 'express';
import { withUser } from './helpers.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import { validateBody } from '../middleware/validateBody.js';
import { createFoodEntrySchema, updateFoodEntrySchema, createFoodEntriesBatchSchema, duplicateDaySchema } from '../schemas/routeSchemas.js';
import * as foodEntryController from '../controllers/foodEntry.js';

const router = Router();

router.get('/api/food-entries', withUser, foodEntryController.list);
router.post('/api/food-entries', withUser, idempotencyMiddleware, validateBody(createFoodEntrySchema), foodEntryController.add);
router.post('/api/food-entries/batch', withUser, validateBody(createFoodEntriesBatchSchema), foodEntryController.addBatch);
router.post('/api/food-entries/duplicate-day', withUser, validateBody(duplicateDaySchema), foodEntryController.duplicateDay);
router.patch('/api/food-entries/:id', withUser, validateBody(updateFoodEntrySchema), foodEntryController.update);
router.delete('/api/food-entries/:id', withUser, foodEntryController.remove);

export default router;
