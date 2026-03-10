/**
 * AI Insights routes.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePro } from '../middleware/requirePro.js';
import * as insightsController from '../controllers/insights.js';

const router = Router();

router.get('/api/insights', requireAuth, requirePro, insightsController.getInsights);
router.post('/api/insights/refresh', requireAuth, requirePro, insightsController.refreshInsightsController);
router.get('/api/insights/stats', requireAuth, insightsController.getStats);
router.get('/api/insights/today', requireAuth, requirePro, insightsController.getTodayRecommendations);
router.get('/api/insights/freshness', requireAuth, requirePro, insightsController.getFreshness);

export default router;
