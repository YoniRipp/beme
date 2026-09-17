/**
 * Event Lambda handler — SQS partial batch response reporting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
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

  it('reports a message whose body is not parseable JSON, and still processes the rest', async () => {
    dispatch.mockResolvedValue(undefined);
    const truncated = { messageId: 'm2', body: '{"type":"goals.GoalCreated","payl' } as SQSRecord;

    const result = await handler(
      sqsEvent(
        record('m1', 'body.WorkoutCreated'),
        truncated,
        record('m3', 'energy.FoodEntryCreated')
      ),
      context
    );

    expect(result).toEqual({ batchItemFailures: [{ itemIdentifier: 'm2' }] });
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('reports no failures when every message succeeds', async () => {
    dispatch.mockResolvedValue(undefined);

    const result = await handler(sqsEvent(record('m1', 'body.WorkoutCreated')), context);

    expect(result).toEqual({ batchItemFailures: [] });
  });
});

/**
 * The handler's batchItemFailures return value is only honoured if the event source
 * mapping opts in. Without this, Lambda treats the invocation as a full success and
 * SQS deletes the failed message instead of redriving it to the DLQ.
 */
describe('event-handler SAM wiring', () => {
  function eventSourceBlock(template: string, logicalId: string): string {
    const lines = template.split('\n');
    const start = lines.findIndex((line) => line.trim() === `${logicalId}:`);
    if (start === -1) return '';
    const indent = lines[start].search(/\S/);
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => line.trim() !== '' && line.search(/\S/) <= indent);
    return (end === -1 ? rest : rest.slice(0, end)).join('\n');
  }

  it('opts the event queue source into ReportBatchItemFailures', () => {
    const template = readFileSync(new URL('../template.yaml', import.meta.url), 'utf8');

    const block = eventSourceBlock(template, 'EventQueueEvent');

    expect(block).toMatch(/FunctionResponseTypes:\s*\n\s*- ReportBatchItemFailures\b/);
  });
});
