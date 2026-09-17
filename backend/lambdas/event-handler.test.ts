/**
 * Event Lambda handler — SQS partial batch response reporting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SQSEvent, SQSRecord, Context } from 'aws-lambda';

const dispatch = vi.fn();

vi.mock('../src/events/dispatcher.js', () => ({
  createDispatcher: () => ({ subscribe: vi.fn(), dispatch }),
}));

vi.mock('../src/events/consumers/register.js', () => ({
  registerAllEventConsumers: vi.fn(),
}));

vi.mock('./connections.js', () => ({
  ensureDb: vi.fn(),
  ensureRedis: vi.fn(),
  closeConnections: vi.fn(),
}));

const { handler } = await import('./event-handler.js');

function record(messageId: string, type: string): SQSRecord {
  return {
    messageId,
    body: JSON.stringify({ type, payload: {}, metadata: { userId: 'u1' } }),
  } as SQSRecord;
}

function sqsEvent(...records: SQSRecord[]): SQSEvent {
  return { Records: records };
}

const context = {} as Context;

describe('event-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reports only the failed messages so the batch is not redelivered whole', async () => {
    dispatch.mockImplementation(async (event: { type: string }) => {
      if (event.type === 'goals.GoalCreated') throw new Error('consumer blew up');
    });

    const result = await handler(
      sqsEvent(
        record('m1', 'body.WorkoutCreated'),
        record('m2', 'goals.GoalCreated'),
        record('m3', 'energy.FoodEntryCreated')
      ),
      context
    );

    expect(result).toEqual({ batchItemFailures: [{ itemIdentifier: 'm2' }] });
  });

  it('reports no failures when every message succeeds', async () => {
    dispatch.mockResolvedValue(undefined);

    const result = await handler(sqsEvent(record('m1', 'body.WorkoutCreated')), context);

    expect(result).toEqual({ batchItemFailures: [] });
  });
});
