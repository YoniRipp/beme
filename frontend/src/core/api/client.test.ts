/**
 * Token persistence: what the client puts in localStorage and what it refuses to read back.
 * The session survives a cold start only through this, so the rules are pinned here.
 */
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { STORAGE_KEYS } from '@/lib/storage';

const JWT = 'header.payload.signature';

/**
 * setupTests.ts installs a localStorage of bare vi.fn()s with nothing behind them, so
 * round-tripping a value needs a real store.
 */
function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

const originalLocalStorage = globalThis.localStorage;

function useStorage(storage: Storage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

/** The module reads localStorage once at import time, so each case needs a fresh import. */
async function importClient() {
  vi.resetModules();
  return import('./client');
}

describe('token persistence', () => {
  beforeEach(() => {
    useStorage(createStorage());
  });

  afterAll(() => {
    useStorage(originalLocalStorage);
  });

  it('restores a stored token on a cold start', async () => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, JWT);

    const { getToken } = await importClient();

    expect(getToken()).toBe(JWT);
  });

  it('writes the token to storage so the next cold start finds it', async () => {
    const { setToken } = await importClient();

    setToken(JWT);

    expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBe(JWT);
  });

  it('clears storage when the token is cleared', async () => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, JWT);
    const { setToken, getToken } = await importClient();

    setToken(null);

    expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("ignores the legacy '1' session flag instead of sending it as a bearer token", async () => {
    // Builds before the JWT was persisted stored '1' here purely as a "has session" marker.
    // Sending it shadows a valid cookie on the server and 401s the user straight out.
    localStorage.setItem(STORAGE_KEYS.TOKEN, '1');

    const { getToken } = await importClient();

    expect(getToken()).toBeNull();
  });

  it('evicts a stored value that is not shaped like a JWT', async () => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, 'not-a-jwt');

    const { getToken } = await importClient();

    expect(getToken()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
  });

  it('survives localStorage throwing, as it does in some private modes', async () => {
    const throwing = createStorage();
    throwing.getItem = () => {
      throw new Error('access denied');
    };
    throwing.setItem = () => {
      throw new Error('access denied');
    };
    useStorage(throwing);

    const { getToken, setToken } = await importClient();
    expect(getToken()).toBeNull();

    // The in-memory token still has to cover the session with no storage behind it.
    expect(() => setToken(JWT)).not.toThrow();
    expect(getToken()).toBe(JWT);
  });
});
