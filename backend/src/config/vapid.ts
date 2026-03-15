/**
 * VAPID configuration for Web Push notifications.
 * Generate keys with: npx web-push generate-vapid-keys
 */
import webpush from 'web-push';
import { config } from './index.js';
import { logger } from '../lib/logger.js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || `mailto:admin@${config.frontendOrigin || 'trackvibe.app'}`;

export const isWebPushConfigured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (isWebPushConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  logger.info('Web Push VAPID configured');
} else {
  logger.info('Web Push disabled (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set)');
}

export { webpush };
export { VAPID_PUBLIC_KEY };
