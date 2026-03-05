/**
 * Food search routes. Basic search is free; AI lookup requires Pro.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePro } from '../middleware/requirePro.js';
import { validateBody } from '../middleware/validateBody.js';
import { lookupOrCreateFoodSchema } from '../schemas/food.js';
import * as foodSearchController from '../controllers/foodSearch.js';
import * as barcodeController from '../controllers/barcode.js';

const router = Router();

router.get('/api/food/search', foodSearchController.search);
router.get('/api/food/barcode/:code', barcodeController.lookupBarcode);
router.post('/api/food/lookup-or-create', requireAuth, requirePro, validateBody(lookupOrCreateFoodSchema), foodSearchController.lookupOrCreate);

export default router;
