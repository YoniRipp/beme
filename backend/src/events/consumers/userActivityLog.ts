/**
 * Consumer: subscribes to '*' and writes every event to user_activity_log.
 * Maps event types to English summaries. Idempotent via event_id UNIQUE.
 */
import { getPool, isDbConfigured } from '../../db/index.js';
import { logger } from '../../lib/logger.js';
import { EventEnvelope } from '../dispatcher.js';

/**
 * @param {string} eventType
 * @param {Record<string, unknown>} payload
 * @returns {string}
 */
function eventToSummary(eventType: string, payload: Record<string, unknown>): string {
  const p = payload ?? {};
  const via = p.source === 'voice' ? ' (via voice)' : '';
  switch (eventType) {
    case 'auth.UserLoggedIn':
      return `Logged in via ${p.method ?? 'unknown'}`;
    case 'auth.UserRegistered':
      return 'Registered an account';
    case 'body.WorkoutCreated':
      return `Logged workout: ${p.title ?? p.name ?? p.id ?? ''}${via}`;
    case 'body.WorkoutUpdated':
      return `Updated workout: ${p.title ?? p.name ?? p.id ?? ''}${via}`;
    case 'body.WorkoutDeleted':
      return `Deleted workout${via}`;
    case 'energy.FoodEntryCreated':
      return `Logged food entry: ${p.name ?? p.foodName ?? p.id ?? ''}${via}`;
    case 'energy.FoodEntryUpdated':
      return `Updated food entry${via}`;
    case 'energy.FoodEntryDeleted':
      return `Deleted food entry${via}`;
    case 'energy.CheckInCreated':
      return `Completed daily check-in${via}`;
    case 'energy.CheckInUpdated':
      return `Updated daily check-in${via}`;
    case 'energy.CheckInDeleted':
      return `Deleted daily check-in${via}`;
    case 'goals.GoalCreated':
      return `Created goal: ${p.title ?? p.name ?? p.id ?? ''}${via}`;
    case 'goals.GoalUpdated':
      return `Updated goal${via}`;
    case 'goals.GoalDeleted':
      return `Deleted goal${via}`;
    case 'voice.VoiceUnderstand':
      return `Voice command: ${Array.isArray(p.intents) ? (p.intents as string[]).join(', ') : 'unknown'} (${p.actionCount ?? 0} actions)`;
    case 'voice.VoiceJobRequested':
      return 'Voice job requested';
    case 'voice.VoiceJobCompleted':
      return 'Voice job completed';
    case 'voice.VoiceJobFailed':
      return 'Voice job failed';
    default:
      return eventType.replace(/\./g, ' ');
  }
}

type SubscribeFn = (eventType: string, handler: (event: EventEnvelope) => Promise<void> | void) => void;

export function registerUserActivityLogConsumer(subscribe: SubscribeFn) {
  subscribe('*', async (event: EventEnvelope) => {
    if (!event.eventId || !event.type) return;
    if (!isDbConfigured()) return;

    const userId = event.metadata?.userId ?? null;
    const summary = eventToSummary(event.type, event.payload ?? {}).trim() || event.type;

    try {
      const pool = getPool();
      await pool.query(
        `INSERT INTO user_activity_log (user_id, event_type, event_id, summary, payload)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (event_id) DO NOTHING`,
        [userId, event.type, event.eventId, summary, JSON.stringify(event.payload ?? {})]
      );
    } catch (err) {
      logger.error({ err, eventId: event.eventId, eventType: event.type }, 'User activity log consumer failed');
    }
  });
}
