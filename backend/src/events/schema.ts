/**
 * Event envelope schema (see docs/event-schema.md).
 * All events on the bus conform to this shape.
 */
import { z } from 'zod';

export const eventMetadataSchema = z.object({
  userId: z.string(),
  timestamp: z.string().datetime({ offset: true }),
  version: z.number().optional(),
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
});

export const eventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  type: z.string().min(1),
  // zod 4 requires an explicit key type; `z.record(v)` is no longer a valid single-arg call.
  payload: z.record(z.string(), z.unknown()),
  metadata: eventMetadataSchema,
});

/**
 * Validate an event against the envelope schema.
 * @param {unknown} event
 * @returns {z.infer<typeof eventEnvelopeSchema>}
 */
export function parseEvent(event: unknown) {
  return eventEnvelopeSchema.parse(event);
}

/**
 * Safe parse; returns { success: true, data } or { success: false, error }.
 * @param {unknown} event
 */
export function safeParseEvent(event: unknown) {
  return eventEnvelopeSchema.safeParse(event);
}
