/**
 * AI Chat routes.
 *
 * `requireAiQuota` debits a call, `requireAiAccess` only checks entitlement —
 * history reads and deletes never reach a model, so they must not be charged.
 */
import { Router } from 'express';
import { withUser } from './helpers.js';
import { requireAiAccess, requireAiQuota } from '../middleware/aiAccess.js';
import * as chatController from '../controllers/chat.js';

const router = Router();

router.post('/api/chat', withUser, requireAiQuota, chatController.chat);
router.post('/api/chat/agent', withUser, requireAiQuota, chatController.agentChat);
router.post('/api/chat/agent/stream', withUser, requireAiQuota, chatController.agentChatStream);
router.post('/api/chat/agent/confirm-plan', withUser, requireAiQuota, chatController.confirmPlan);
router.get('/api/chat/history', withUser, requireAiAccess, chatController.getHistory);
router.delete('/api/chat/history', withUser, requireAiAccess, chatController.deleteHistory);

export default router;
