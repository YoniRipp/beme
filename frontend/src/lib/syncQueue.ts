/**
 * Offline sync queue backed by IndexedDB.
 * Queues failed/offline mutations and replays them when back online.
 */
import { openDB, type IDBPDatabase } from 'idb';
import { FEATURE_FLAGS } from './featureFlags';

export interface PendingRequest {
  id: number;
  url: string;
  method: string;
  body: string | null;
  headers: Record<string, string>;
  timestamp: number;
  retries: number;
}

const DB_NAME = 'trackvibe-offline';
const STORE_NAME = 'pendingRequests';
const DB_VERSION = 1;
const MAX_RETRIES = 5;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueue(
  url: string,
  method: string,
  body: string | null,
  headers: Record<string, string>,
): Promise<void> {
  if (!FEATURE_FLAGS.PWA_OFFLINE_SYNC) return;
  const db = await getDb();
  await db.add(STORE_NAME, {
    url,
    method,
    body,
    headers,
    timestamp: Date.now(),
    retries: 0,
  });
}

export async function getPendingCount(): Promise<number> {
  if (!FEATURE_FLAGS.PWA_OFFLINE_SYNC) return 0;
  const db = await getDb();
  return db.count(STORE_NAME);
}

export async function getAll(): Promise<PendingRequest[]> {
  if (!FEATURE_FLAGS.PWA_OFFLINE_SYNC) return [];
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function remove(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

/**
 * Replay all pending requests in FIFO order.
 * Returns the number of successfully replayed requests.
 */
export async function flush(): Promise<number> {
  if (!FEATURE_FLAGS.PWA_OFFLINE_SYNC) return 0;
  const pending = await getAll();
  let synced = 0;

  for (const req of pending) {
    try {
      const res = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        credentials: 'include',
      });
      if (res.ok || res.status === 409) {
        // Success or conflict (already exists) — remove from queue
        await remove(req.id);
        synced++;
      } else if (res.status === 401) {
        // Auth expired — stop flushing, user needs to re-login
        break;
      } else {
        // Server error — increment retries
        await incrementRetries(req);
      }
    } catch {
      // Network still down or other error — increment retries
      await incrementRetries(req);
    }
  }

  return synced;
}

async function incrementRetries(req: PendingRequest): Promise<void> {
  const db = await getDb();
  if (req.retries >= MAX_RETRIES) {
    // Give up after max retries
    await db.delete(STORE_NAME, req.id);
    return;
  }
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const existing = await store.get(req.id);
  if (existing) {
    existing.retries = (existing.retries || 0) + 1;
    await store.put(existing);
  }
  await tx.done;
}
