/**
 * Auth routes — thin router definition delegating to auth controller.
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as authController from '../controllers/auth.js';

const router = Router();

router.post('/api/auth/register', authController.register);
router.post('/api/auth/login', authController.login);
router.post('/api/auth/google', authController.loginGoogle);
router.post('/api/auth/facebook', authController.loginFacebook);
router.post('/api/auth/twitter', authController.loginTwitter);
router.get('/api/auth/twitter/redirect', authController.twitterRedirect);
router.get('/api/auth/twitter/callback', authController.twitterCallback);
router.post('/api/auth/exchange', authController.exchangeCode);
router.get('/api/auth/me', requireAuth, authController.me);
router.post('/api/auth/refresh', requireAuth, authController.refresh);
router.post('/api/auth/forgot-password', authController.forgotPassword);
router.post('/api/auth/reset-password', authController.resetPassword);
router.post('/api/auth/logout', authController.logout);

export default router;
