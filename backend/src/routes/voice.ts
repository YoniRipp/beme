/**
 * Voice routes. Both endpoints reach a model, so both debit a call.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAiQuota } from '../middleware/aiAccess.js';
import * as voiceController from '../controllers/voice.js';

const router = Router();

router.post('/api/voice/understand', requireAuth, requireAiQuota, voiceController.understand);
router.post('/api/voice/transcribe', requireAuth, requireAiQuota, voiceController.transcribe);

export default router;
