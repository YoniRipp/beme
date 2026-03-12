/**
 * Streak updater consumer.
 *
 * Listens to domain events (WorkoutCreated, FoodEntryCreated)
 * and records streak activity for the user.
 */
import { logger } from '../../lib/logger.js';
import { EventEnvelope } from '../dispatcher.js';
import * as streakService from '../../services/streak.js';

/** Extract date from event payload (falls back to today). */
function eventDate(event: EventEnvelope): string {
  const d = event.payload?.date ?? (event.metadata?.timestamp?.slice(0, 10) as string | undefined);
  return d && typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date().toISOString().slice(0, 10);
}

type SubscribeFn = (eventType: string, handler: (event: EventEnvelope) => Promise<void> | void) => void;

/**
 * Register streak updater consumers.
 * @param {SubscribeFn} subscribe
 */
export function registerStreakUpdaterConsumer(subscribe: SubscribeFn) {
  subscribe('body.WorkoutCreated', async (event: EventEnvelope) => {
    const userId = event.metadata?.userId;
    if (!userId) return;
    const date = eventDate(event);
    try {
      await streakService.recordActivity(userId, 'workout', date);
      logger.debug({ eventType: event.type, userId, date }, 'streakUpdater: workout streak updated');
    } catch (err) {
      logger.warn({ err, userId, date }, 'streakUpdater: failed to update workout streak');
    }
  });

  subscribe('energy.FoodEntryCreated', async (event: EventEnvelope) => {
    const userId = event.metadata?.userId;
    if (!userId) return;
    const date = eventDate(event);
    try {
      await streakService.recordActivity(userId, 'food', date);
      logger.debug({ eventType: event.type, userId, date }, 'streakUpdater: food streak updated');
    } catch (err) {
      logger.warn({ err, userId, date }, 'streakUpdater: failed to update food streak');
    }
  });
}
