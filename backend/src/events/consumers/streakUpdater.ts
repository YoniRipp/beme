/**
 * Streak updater consumer.
 *
 * Listens to domain events (WorkoutCreated, FoodEntryCreated)
 * and records streak activity for the user.
 */
import { logger } from '../../lib/logger.js';
import { EventEnvelope } from '../dispatcher.js';
import * as streakService from '../../services/streak.js';
import { toDateString } from '../../utils/date.js';

/** Extract date from event payload (falls back to today). */
function eventDate(event: EventEnvelope): string {
  // The event timestamp is a UTC instant: read its local calendar day rather than
  // slicing the UTC date off it, so the streak lands on the same day as the entry.
  const ts = event.metadata?.timestamp;
  const d = event.payload?.date ?? (ts ? toDateString(new Date(ts)) : undefined);
  return d && typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : toDateString(new Date());
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
      throw err;
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
      throw err;
    }
  });
}
