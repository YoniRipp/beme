/**
 * Helpers to publish domain events (envelope + metadata) after write operations.
 */
import crypto from 'crypto';
import { getRequestId } from '../lib/requestContext.js';
import { publish as busPublish } from './bus.js';
import { voiceContext } from '../lib/voiceContext.js';

/**
 * Publish a domain event with standard envelope.
 * @param {string} type - Event type (e.g. 'money.TransactionCreated')
 * @param {Record<string, unknown>} payload - Domain payload
 * @param {string} userId - User who triggered the action
 * @param {{ correlationId?: string; causationId?: string }} [meta]
 */
type PublishMeta = { correlationId?: string; causationId?: string };
export async function publishEvent(type: string, payload: Record<string, unknown>, userId: string, meta: PublishMeta = {}) {
  const correlationId = meta.correlationId ?? getRequestId();
  const store = voiceContext.getStore();
  const enrichedPayload = store ? { ...payload, source: store.source } : payload;
  await busPublish({
    eventId: crypto.randomUUID(),
    type,
    payload: enrichedPayload,
    metadata: {
      userId,
      timestamp: new Date().toISOString(),
      version: 1,
      ...(correlationId && { correlationId }),
      ...(meta.causationId && { causationId: meta.causationId }),
    },
  });
}
