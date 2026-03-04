/**
 * Standalone event consumer process. Connects to the event bus (Redis or SQS) and runs
 * consumers (e.g. transaction analytics). No HTTP server. Deploy as a separate service.
 *
 * Run: node workers/event-consumer.js (with REDIS_URL or EVENT_TRANSPORT=sqs + EVENT_QUEUE_URL + AWS_REGION)
 */
import { config } from '../src/config/index.js';
import { subscribe, startEventsWorker, closeEventsBus } from '../src/events/bus.js';
import { registerUserActivityLogConsumer } from '../src/events/consumers/userActivityLog.js';
import { registerStatsAggregatorConsumer } from '../src/events/consumers/statsAggregator.js';
import { getRedisClient, closeRedis } from '../src/redis/client.js';
import { logger } from '../src/lib/logger.js';

registerUserActivityLogConsumer(subscribe);
registerStatsAggregatorConsumer(subscribe);

const worker = startEventsWorker();
if (!worker) {
  logger.warn('Event consumer: no transport (set REDIS_URL or EVENT_TRANSPORT=sqs with EVENT_QUEUE_URL). Exiting.');
  process.exit(0);
}

async function shutdown() {
  logger.info('Event consumer shutting down');
  await closeEventsBus();
  await closeRedis();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info('Event consumer started');
