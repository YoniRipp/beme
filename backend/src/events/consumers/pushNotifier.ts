/**
 * Push notification event consumer.
 * Listens to domain events and sends push notifications for notable actions.
 */
import { sendPush } from '../../services/pushService.js';
import { logger } from '../../lib/logger.js';
import type { EventEnvelope } from '../dispatcher.js';

type SubscribeFn = (eventType: string, handler: (event: EventEnvelope) => Promise<void> | void) => void;

const EVENT_MESSAGES: Record<string, (payload: Record<string, unknown>) => { title: string; body: string } | null> = {
  'goals.GoalCompleted': (p) => ({
    title: 'Goal Completed!',
    body: `You reached your ${p.type || 'goal'} target. Great work!`,
  }),
  'body.WorkoutCreated': (p) => ({
    title: 'Workout Logged',
    body: `${p.title || 'Workout'} recorded. Keep it up!`,
  }),
};

async function handleEvent(event: EventEnvelope) {
  const builder = EVENT_MESSAGES[event.type];
  if (!builder) return;

  const message = builder(event.payload);
  if (!message) return;

  const userId = event.metadata.userId;
  if (!userId) return;

  try {
    await sendPush(userId, {
      ...message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      url: '/',
    });
  } catch (err) {
    logger.error({ err, eventType: event.type, userId }, 'Push notification failed');
  }
}

export function registerPushNotifierConsumer(subscribe: SubscribeFn) {
  for (const eventType of Object.keys(EVENT_MESSAGES)) {
    subscribe(eventType, handleEvent);
  }
}
