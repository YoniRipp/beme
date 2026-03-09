/**
 * Sync manager: listens for online events and flushes the offline queue.
 * Provides a React hook for components to track pending sync count.
 */
import { useState, useEffect, useCallback } from 'react';
import { flush, getPendingCount } from './syncQueue';
import { FEATURE_FLAGS } from './featureFlags';

let isFlushing = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

async function handleOnline() {
  if (isFlushing || !FEATURE_FLAGS.PWA_OFFLINE_SYNC) return;
  isFlushing = true;
  try {
    await flush();
  } finally {
    isFlushing = false;
    notifyListeners();
  }
}

/** Call once at app startup to wire up automatic sync on reconnect. */
export function initSyncManager(): void {
  if (!FEATURE_FLAGS.PWA_OFFLINE_SYNC) return;
  window.addEventListener('online', handleOnline);
}

export function teardownSyncManager(): void {
  window.removeEventListener('online', handleOnline);
}

/**
 * React hook: returns pending sync count and a manual flush trigger.
 */
export function useSyncQueue() {
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refresh();

    // Re-check count whenever a flush completes or when going online/offline
    const listener = () => { refresh(); };
    listeners.add(listener);
    window.addEventListener('online', listener);
    window.addEventListener('offline', listener);

    // Poll periodically for changes from other tabs or enqueue calls
    const interval = setInterval(refresh, 3000);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('online', listener);
      window.removeEventListener('offline', listener);
      clearInterval(interval);
    };
  }, [refresh]);

  const manualFlush = useCallback(async () => {
    await handleOnline();
    await refresh();
  }, [refresh]);

  return { pendingCount, flush: manualFlush };
}
