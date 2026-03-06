/**
 * Redis client. Optional; app runs without Redis when REDIS_URL is unset.
 */
import { createClient } from 'redis';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let redisConnected = false;

export function isRedisConfigured() {
  return config.isRedisConfigured;
}

export function isRedisHealthy() {
  return redisConnected && client?.isOpen;
}

export async function getRedisClient() {
  if (!config.isRedisConfigured) return null;
  if (!client) {
    client = createClient({ url: config.redisUrl });
    client.on('error', (err: unknown) => {
      logger.error({ err }, 'Redis error');
      redisConnected = false;
    });
    client.on('reconnecting', () => {
      logger.info('Redis reconnecting');
      redisConnected = false;
    });
    client.on('ready', () => {
      logger.info('Redis connected');
      redisConnected = true;
    });
    await client.connect();
    redisConnected = true;
  }
  return client;
}

export async function closeRedis() {
  if (client) {
    await client.quit();
    client = null;
  }
}
