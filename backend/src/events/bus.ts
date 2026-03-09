/**
 * Event bus: publish(event) and subscribe(eventType, handler).
 * Transport: EVENT_TRANSPORT=redis (default) uses BullMQ; EVENT_TRANSPORT=sqs uses SQS; no transport = in-memory sync (tests).
 */
import { Queue, Worker } from 'bullmq';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { createSqsTransport } from './transports/sqs.js';
import { createDispatcher, EventEnvelope } from './dispatcher.js';
import { recordEventPublished, recordEventProcessed, recordEventFailed } from '../lib/metrics.js';

const QUEUE_NAME = 'events';
const DLQ_NAME = 'events-dlq';

const dispatcher = createDispatcher();

let eventsQueue: Queue | null = null;
let eventsDlq: Queue | null = null;
let eventsWorker: Worker | null = null;
let sqsConsumer: { close(): Promise<void> } | null = null;
let cachedSqsTransport: ReturnType<typeof createSqsTransport> | null = null;

/** @returns {'memory' | 'redis' | 'sqs'} */
function getTransport(): 'memory' | 'redis' | 'sqs' {
  if (config.eventTransport === 'sqs' && config.eventQueueUrl && config.awsRegion) return 'sqs';
  if (config.isRedisConfigured) return 'redis';
  return 'memory';
}

/**
 * Subscribe to an event type. Handler receives the full event envelope.
 */
export function subscribe(eventType: string, handler: (event: EventEnvelope) => Promise<void> | void) {
  dispatcher.subscribe(eventType, handler);
}

/**
 * Publish an event. Uses configured transport (redis, sqs, or in-memory).
 * @param {EventEnvelope} event
 * @returns {Promise<void>}
 */
export async function publish(event: EventEnvelope) {
  recordEventPublished();
  const transport = getTransport();
  if (transport === 'sqs') {
    if (!config.awsRegion || !config.eventQueueUrl) throw new Error('SQS requires AWS_REGION and EVENT_QUEUE_URL');
    if (!cachedSqsTransport) {
      cachedSqsTransport = createSqsTransport({ region: config.awsRegion, queueUrl: config.eventQueueUrl });
    }
    await cachedSqsTransport.publish(event);
    return;
  }
  if (transport === 'redis') {
    const queue = await getEventsQueue();
    if (queue) await queue.add(event.type, event, {
      removeOnComplete: true,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    return;
  }
  try {
    await dispatcher.dispatch(event);
  } catch (err) {
    logger.error({ err, eventType: event.type, eventId: event.eventId }, 'Event handler error');
  }
}

export async function getEventsQueue(): Promise<Queue | null> {
  if (getTransport() !== 'redis') return null;
  if (!eventsQueue) {
    eventsQueue = new Queue(QUEUE_NAME, { connection: { url: config.redisUrl } });
  }
  return eventsQueue;
}

export async function getEventsDlq(): Promise<Queue | null> {
  if (getTransport() !== 'redis') return null;
  if (!eventsDlq) {
    eventsDlq = new Queue(DLQ_NAME, { connection: { url: config.redisUrl } });
  }
  return eventsDlq;
}

async function invokeHandlers(event: EventEnvelope) {
  try {
    await dispatcher.dispatch(event);
    recordEventProcessed();
  } catch (err) {
    recordEventFailed();
    logger.error({ err, eventType: event?.type, eventId: event?.eventId }, 'Event worker handler error');
    throw err;
  }
}

/**
 * Start the events worker. Redis: BullMQ worker; SQS: long-poll consumer; otherwise null.
 */
export function startEventsWorker() {
  const transport = getTransport();
  if (transport === 'redis') {
    if (eventsWorker) return eventsWorker;
    eventsWorker = new Worker(
      QUEUE_NAME,
      async (job) => invokeHandlers(job.data),
      { connection: { url: config.redisUrl }, concurrency: 5 }
    );
    eventsWorker.on('error', (err) => logger.error({ err }, 'Events worker error'));
    eventsWorker.on('failed', async (job, err) => {
      if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
        try {
          const dlq = await getEventsDlq();
          if (dlq) {
            await dlq.add(job.name, job.data, {
              removeOnComplete: true,
              removeOnFail: false,
            });
            logger.warn({ eventType: job.name, eventId: job.data?.eventId, err }, 'Event moved to DLQ after exhausting retries');
          }
        } catch (dlqErr) {
          logger.error({ dlqErr, eventType: job.name, eventId: job.data?.eventId }, 'Failed to move event to DLQ');
        }
      }
    });
    return eventsWorker;
  }
  if (transport === 'sqs') {
    if (sqsConsumer) return sqsConsumer;
    if (!config.awsRegion || !config.eventQueueUrl) throw new Error('SQS requires AWS_REGION and EVENT_QUEUE_URL');
    if (!cachedSqsTransport) {
      cachedSqsTransport = createSqsTransport({ region: config.awsRegion, queueUrl: config.eventQueueUrl });
    }
    sqsConsumer = cachedSqsTransport.startConsumer((event: unknown) => invokeHandlers(event as EventEnvelope));
    return sqsConsumer;
  }
  return null;
}

export async function closeEventsBus() {
  if (eventsWorker) {
    await eventsWorker.close();
    eventsWorker = null;
  }
  if (sqsConsumer?.close) {
    await sqsConsumer.close();
    sqsConsumer = null;
  }
  if (eventsQueue) {
    await eventsQueue.close();
    eventsQueue = null;
  }
  if (eventsDlq) {
    await eventsDlq.close();
    eventsDlq = null;
  }
  cachedSqsTransport = null;
}
