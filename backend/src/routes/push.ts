/**
 * Push notification routes.
 */
import { Router } from 'express';
import { withUser } from './helpers.js';
import * as pushController from '../controllers/push.js';

const router = Router();

// Public: get VAPID public key (needed by frontend before auth in some flows)
router.get('/api/push/vapid-key', pushController.getVapidPublicKey);

// Protected: manage push subscriptions
router.post('/api/push/subscribe', withUser, pushController.subscribe);
router.post('/api/push/unsubscribe', withUser, pushController.unsubscribe);

export default router;
