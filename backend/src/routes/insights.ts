/**
 * AI Insights routes.
 *
 * `/freshness` is two SELECTs and a timestamp comparison — it never reaches a model,
 * so it only checks entitlement.
 *
 * `GET /api/insights` still debits on entry even though it usually serves cache. That
 * overcharges the cache-hit path, and it is deliberate rather than an oversight: the
 * honest fix is to debit inside `services/insights.ts` at the point `generateInsights`
 * runs, and that cannot be done safely in isolation. `getOrGenerateInsights` is shared
 * with `/today` and `/refresh` (which already debit at this layer, so a service-level
 * debit would double-charge them), and `refreshAllPeriods` fans out to three more
 * background generations that would each start billing. Moving to `requireAiAccess`
 * here is not an option either — a cache miss would reach Gemini for free, without
 * limit. Tracked in agent-os/specs/2026-09-14-1300-ai-quota-consumed-by-reads.
 */
import { Router } from 'express';
import { withUser } from './helpers.js';
import { requireAiAccess, requireAiQuota } from '../middleware/aiAccess.js';
import * as insightsController from '../controllers/insights.js';

const router = Router();

router.get('/api/insights', withUser, requireAiQuota, insightsController.getInsights);
router.post('/api/insights/refresh', withUser, requireAiQuota, insightsController.refreshInsightsController);
router.get('/api/insights/stats', withUser, insightsController.getStats);
router.get('/api/insights/today', withUser, requireAiQuota, insightsController.getTodayRecommendations);
router.get('/api/insights/freshness', withUser, requireAiAccess, insightsController.getFreshness);

export default router;
