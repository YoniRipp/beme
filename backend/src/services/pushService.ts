/**
 * Push notification service — sends web push notifications to users.
 */
import { webpush, isWebPushConfigured } from '../config/vapid.js';
import * as pushSubscriptionModel from '../models/pushSubscription.js';
import { logger } from '../lib/logger.js';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to all of a user's registered devices.
 */
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  if (!isWebPushConfigured) {
    logger.debug('Push skipped: VAPID not configured');
    return;
  }

  const subscriptions = await pushSubscriptionModel.findByUserId(userId);
  if (subscriptions.length === 0) return;

  const payloadStr = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keysP256dh, auth: sub.keysAuth },
          },
          payloadStr,
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Subscription expired or invalid — clean up
          logger.info({ endpoint: sub.endpoint }, 'Removing expired push subscription');
          await pushSubscriptionModel.removeById(sub.id);
        } else {
          throw err;
        }
      }
    }),
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    logger.warn({ userId, failed: failed.length, total: subscriptions.length }, 'Some push notifications failed');
  }
}
