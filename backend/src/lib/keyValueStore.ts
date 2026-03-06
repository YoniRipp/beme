/**
 * Key-value store with TTL. Uses Redis when REDIS_URL is set; in-memory fallback for local dev.
 */
import { config } from '../config/index.js';
import { getRedisClient } from '../redis/client.js';
import { logger } from './logger.js';

const MAX_MEMORY_SIZE = 10000;

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

// Periodic cleanup to prevent memory leaks from expired but unaccessed entries
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, e] of memoryStore.entries()) {
    if (e.expiresAt <= now) memoryStore.delete(k);
  }
}, CLEANUP_INTERVAL_MS).unref();

function memoryPrune() {
  const now = Date.now();
  for (const [k, e] of memoryStore.entries()) {
    if (e.expiresAt <= now) memoryStore.delete(k);
  }
  if (memoryStore.size > MAX_MEMORY_SIZE) {
    const toRemove = memoryStore.size - MAX_MEMORY_SIZE;
    let removed = 0;
    for (const k of memoryStore.keys()) {
      if (removed >= toRemove) break;
      memoryStore.delete(k);
      removed++;
    }
  }
}

export async function kvGet(key: string): Promise<string | null> {
  if (config.isRedisConfigured) {
    try {
      const redis = await getRedisClient();
      if (redis) {
        return await redis.get(key);
      }
    } catch (e) {
      logger.warn({ err: e }, 'Redis get failed, falling back to memory');
      // Fall through to memory
    }
  }
  memoryPrune();
  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

export async function kvSet(key: string, value: string, ttlMs?: number): Promise<void> {
  if (config.isRedisConfigured) {
    try {
      const redis = await getRedisClient();
      if (redis) {
        const ttlSec = ttlMs != null ? Math.ceil(ttlMs / 1000) : undefined;
        if (ttlSec != null) {
          await redis.setEx(key, ttlSec, value);
        } else {
          await redis.set(key, value);
        }
        return;
      }
    } catch (e) {
      logger.warn({ err: e }, 'Redis set failed, falling back to memory');
    }
  }
  memoryPrune();
  const expiresAt = ttlMs != null ? Date.now() + ttlMs : Date.now() + 24 * 60 * 60 * 1000;
  memoryStore.set(key, { value, expiresAt });
}

export async function kvDelete(key: string): Promise<void> {
  if (config.isRedisConfigured) {
    try {
      const redis = await getRedisClient();
      if (redis) {
        await redis.del(key);
        return;
      }
    } catch (e) {
      logger.warn({ err: e }, 'Redis del failed');
    }
  }
  memoryStore.delete(key);
}

/**
 * Atomically get and delete a key. Prevents race conditions where two concurrent
 * requests could both read the same value before either deletes it.
 */
export async function kvGetAndDelete(key: string): Promise<string | null> {
  if (config.isRedisConfigured) {
    try {
      const redis = await getRedisClient();
      if (redis) {
        return await redis.getDel(key);
      }
    } catch (e) {
      logger.warn({ err: e }, 'Redis getDel failed, falling back to memory');
    }
  }
  memoryPrune();
  const entry = memoryStore.get(key);
  memoryStore.delete(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }
  return entry.value;
}
