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
  timestamp: number;
  retries: number;
}

const DB_NAME = 'trackvibe-offline';
const STORE_NAME = 'pendingRequests';
const DB_VERSION = 1;
const MAX_RETRIES = 5;

/**
 * How a replayed request proves who it is.
 *
 * Registered by `core/api/client.ts` rather than imported from it, because the dependency
 * already runs the other way (`client` imports `enqueue`) and a static cycle here would bite
 * at module-init time.
 *
 * The token is read **at replay time, not at enqueue time**, and is deliberately never written
 * to IndexedDB. A queued request can sit for days; a token stored beside it would be stale by
 * the time it is used, and would put a second copy of a live credential in a second store.
 */
let authTokenProvider: (() => string | null) | null = null;

/** Pass `null` to unregister — used by tests to assert the unregistered case warns. */
export function setAuthTokenProvider(provider: (() => string | null) | null): void {
  authTokenProvider = provider;
}

/**
 * What to do with a queued request, given the status its replay came back with.
 *
 * Pulled out as a pure function so the policy is testable without IndexedDB or a network —
 * this file's behaviour was entirely untested, and the policy is where the consequences are.
 */
export type ReplayOutcome = 'done' | 'retry' | 'stop';

export function replayOutcome(status: number): ReplayOutcome {
  // 409 means the server already has it — a replay of something that landed before the
  // connection dropped. Same outcome as success: stop asking.
  if ((status >= 200 && status < 300) || status === 409) return 'done';
  // Re-authentication is a user action; hammering the rest of the queue would just produce
  // more 401s. Stop and leave the queue intact for after they log back in.
  if (status === 401) return 'stop';
  return 'retry';
}

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

/**
 * Queue a mutation for replay.
 *
 * `headers` is accepted and **not stored**: the only one that matters is `Authorization`, and
 * storing a credential next to the request body is both a second place to leak it from and a
 * guarantee it will be stale when used. `flush` attaches a fresh one instead. The parameter
 * stays so the call site reads honestly about what it has.
 */
export async function enqueue(
  url: string,
  method: string,
  body: string | null,
  _headers: Record<string, string>,
): Promise<void> {
  if (!FEATURE_FLAGS.PWA_OFFLINE_SYNC) return;
  const db = await getDb();
  await db.add(STORE_NAME, {
    url,
    method,
    body,
    timestamp: Date.now(),
    retries: 0,
  });
}

export async function clearOfflineQueue(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
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
        headers: replayHeaders(),
        body: req.body,
        credentials: 'include',
      });
      const outcome = replayOutcome(res.status);
      if (outcome === 'done') {
        await remove(req.id);
        synced++;
      } else if (outcome === 'stop') {
        break;
      } else {
        await incrementRetries(req);
      }
    } catch {
      // Network still down or other error — increment retries
      await incrementRetries(req);
    }
  }

  return synced;
}

/**
 * Headers for a replay, including the bearer token.
 *
 * **This is what the replay used to be missing entirely**, and it mattered more than it looks.
 * The cookie is `sameSite: 'strict'` (`backend/src/controllers/auth.ts`), so it is not sent
 * when the app and the API are not same-site — which is the production arrangement, and the
 * reason `client.ts` keeps an in-memory token mirrored to localStorage at all. A replay
 * therefore carried NO credential: no header, no cookie. Every queued mutation came back 401,
 * `replayOutcome` says stop, and the queue sat there for good — while the user had already
 * been told the write succeeded, because an offline `request` returns the submitted body as a
 * placeholder.
 *
 * Only `PWA_OFFLINE_SYNC` being off by default kept that from losing real data.
 */
export function replayHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Platform': 'web',
  };

  // No provider at all is not the same as a logged-out user: it means nothing ever imported
  // `client.ts`, so replays would go out unauthenticated — silently, which is precisely how
  // the original bug survived. A logged-out user legitimately has no token and gets no warning.
  if (!authTokenProvider) {
    console.warn(
      'syncQueue: no auth token provider registered; replays will be unauthenticated'
    );
    return headers;
  }

  const token = authTokenProvider();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
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
