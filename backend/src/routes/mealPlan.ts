/**
 * Meal plan routes.
 */
import { Router } from 'express';
import { withUser } from './helpers.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import { validateBody } from '../middleware/validateBody.js';
import { createMealPlanSchema, updateMealPlanSchema, applyMealPlanSchema, lookupNutritionSchema } from '../schemas/routeSchemas.js';
import * as mealPlanController from '../controllers/mealPlan.js';

const router = Router();

router.get('/api/meal-plans', withUser, mealPlanController.list);
router.post('/api/meal-plans', withUser, idempotencyMiddleware, validateBody(createMealPlanSchema), mealPlanController.add);
router.post('/api/meal-plans/lookup', withUser, validateBody(lookupNutritionSchema), mealPlanController.lookupNutrition);
router.get('/api/meal-plans/:id', withUser, mealPlanController.getById);
router.patch('/api/meal-plans/:id', withUser, validateBody(updateMealPlanSchema), mealPlanController.update);
router.delete('/api/meal-plans/:id', withUser, mealPlanController.remove);
router.post('/api/meal-plans/:id/apply', withUser, validateBody(applyMealPlanSchema), mealPlanController.applyToDay);

export default router;
