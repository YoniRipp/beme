/**
 * The service worker's update path.
 *
 * `vite.config.ts` registers with `registerType: 'autoUpdate'`, and in auto mode
 * `virtual:pwa-register`'s `updateServiceWorker()` is a no-op and `onNeedRefresh` never
 * fires — so the only thing that can ever promote a waiting worker is the worker itself.
 * Without `skipWaiting()` on install a new build stays in `waiting` forever and every user
 * keeps running the bundle they already have.
 *
 * Imports the real `sw.ts` into jsdom with the workbox modules stubbed, then dispatches the
 * real lifecycle events at the global the worker attached its listeners to. This is as far
 * as a unit test reaches: it proves the listeners exist and call the right APIs, not that a
 * deployed build actually swaps — that needs a real build served over HTTPS.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('workbox-precaching', () => ({
  precacheAndRoute: vi.fn(),
  cleanupOutdatedCaches: vi.fn(),
}));
vi.mock('workbox-routing', () => ({ registerRoute: vi.fn() }));
vi.mock('workbox-strategies', () => ({ CacheFirst: class CacheFirst {} }));
vi.mock('workbox-expiration', () => ({ ExpirationPlugin: class ExpirationPlugin {} }));

const skipWaiting = vi.fn();
const claim = vi.fn(() => Promise.resolve());

/** An ExtendableEvent is an Event plus `waitUntil`; jsdom has no such constructor. */
function extendableEvent(type: string) {
  const event = new Event(type) as Event & { waitUntil: (promise: Promise<unknown>) => void };
  event.waitUntil = vi.fn();
  return event;
}

beforeAll(async () => {
  Object.assign(self, {
    skipWaiting,
    clients: { claim, matchAll: vi.fn(() => Promise.resolve([])), openWindow: vi.fn() },
    registration: { showNotification: vi.fn() },
  });
  await import('./sw');
});

beforeEach(() => {
  skipWaiting.mockClear();
  claim.mockClear();
});

describe('service worker update path', () => {
  it('skips waiting on install, so a new build is not stuck behind the open tab', () => {
    self.dispatchEvent(extendableEvent('install'));

    expect(skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('claims open clients on activate', () => {
    const event = extendableEvent('activate');

    self.dispatchEvent(event);

    expect(claim).toHaveBeenCalledTimes(1);
    expect(event.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('still skips waiting on a SKIP_WAITING message', () => {
    self.dispatchEvent(new MessageEvent('message', { data: { type: 'SKIP_WAITING' } }));

    expect(skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('ignores an unrelated message', () => {
    self.dispatchEvent(new MessageEvent('message', { data: { type: 'CACHE_URLS' } }));

    expect(skipWaiting).not.toHaveBeenCalled();
  });
});
