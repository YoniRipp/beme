/**
 * AI Chat routes.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePro } from '../middleware/requirePro.js';
import * as chatController from '../controllers/chat.js';

const router = Router();

router.post('/api/chat', requireAuth, requirePro, chatController.chat);
router.post('/api/chat/agent', requireAuth, requirePro, chatController.agentChat);
router.post('/api/chat/agent/stream', requireAuth, requirePro, chatController.agentChatStream);
router.post('/api/chat/agent/confirm-plan', requireAuth, requirePro, chatController.confirmPlan);
router.get('/api/chat/history', requireAuth, requirePro, chatController.getHistory);
router.delete('/api/chat/history', requireAuth, requirePro, chatController.deleteHistory);

export default router;
