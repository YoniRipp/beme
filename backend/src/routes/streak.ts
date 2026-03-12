/**
 * Streak routes.
 */
import { Router } from 'express';
import { withUser } from './helpers.js';
import * as streakController from '../controllers/streak.js';

const router = Router();

router.get('/api/streaks', withUser, streakController.list);

export default router;
