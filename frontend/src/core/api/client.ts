/// <reference types="vite/client" />

import { STORAGE_KEYS } from '@/lib/storage';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { enqueue } from '@/lib/syncQueue';
import type { PaginatedResponse } from '@/types/api';
import { createRequestAllPages } from '@trackvibe/shared/api';

const API_BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
  || (typeof window !== 'undefined' && (import.meta as { env?: { PROD?: boolean } }).env?.PROD ? window.location.origin : '')
  || (typeof window !== 'undefined' ? `http://${window.location.hostname}:3000` : '');

const DEFAULT_TIMEOUT_MS = 30000;

export function getApiBase(): string {
  return API_BASE;
}

/**
 * A JWT, not the literal '1' that a much older build stored here as a mere "has session"
 * flag. Sending that as a bearer token shadows a perfectly good cookie and 401s.
 */
function looksLikeJwt(value: string): boolean {
  return value.split('.').length === 3;
}

function readStoredToken(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!stored || !looksLikeJwt(stored)) {
      if (stored) localStorage.removeItem(STORAGE_KEYS.TOKEN);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

/**
 * Mirrored to localStorage so a cold start can attach the Authorization header before the
 * first request goes out. The httpOnly cookie is still the primary carrier, but it is
 * dropped whenever the app and the API are not same-site -- the Capacitor shell, and the
 * cross-origin dev/cloud domains that caused the login-logout bug in 47a869f -- which left
 * an in-memory-only token meaning a fresh login on every launch.
 */
let inMemoryToken: string | null = readStoredToken();

export function getToken(): string | null {
  return inMemoryToken;
}

export function setToken(token: string | null): void {
  inMemoryToken = token;
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
  } catch {
    // Private mode or a full quota -- the in-memory token still covers this session.
  }
}

/** Call this when the API returns 401 so auth state is cleared and UI can redirect. */
export function handleUnauthorized(options: { suppressEvent?: boolean } = {}): void {
  setToken(null);
  if (options.suppressEvent) return;
  try {
    window.dispatchEvent(new CustomEvent('auth:logout'));
  } catch {
    // ignore
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: HeadersInit;
  body?: unknown;
  timeoutMs?: number;
  suppressUnauthorizedEvent?: boolean;
  /**
   * Keep this request out of the offline replay queue. Auth calls must never be queued:
   * `flush` replays without an Authorization header and breaks out of the loop on a 401
   * without incrementing retries, so a stuck auth entry blocks every real mutation behind it.
   */
  skipOfflineQueue?: boolean;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
  /** Internal: this attempt deliberately omits the bearer token. Callers never pass it. */
  isCookieRetry = false,
): Promise<T> {
  const { method = 'GET', body, headers, timeoutMs = DEFAULT_TIMEOUT_MS, suppressUnauthorizedEvent, skipOfflineQueue } = options;
  const isWrite = method !== 'GET';
  const canQueueOffline = isWrite && !skipOfflineQueue;
  const fullUrl = `${API_BASE}${path}`;
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Platform': 'web',
    ...headers,
  } as Record<string, string>;
  if (inMemoryToken && !isCookieRetry) {
    requestHeaders['Authorization'] = `Bearer ${inMemoryToken}`;
  }
  const bodyStr = body != null ? JSON.stringify(body) : null;

  // Offline queue: enqueue mutations when offline instead of failing
  if (canQueueOffline && !navigator.onLine && FEATURE_FLAGS.PWA_OFFLINE_SYNC) {
    await enqueue(fullUrl, method, bodyStr, requestHeaders);
    // Return a placeholder so callers don't break. React Query will refetch on reconnect.
    return (body ?? {}) as T;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(fullUrl, {
      method,
      signal: controller.signal,
      credentials: 'include',
      headers: requestHeaders,
      ...(bodyStr != null ? { body: bodyStr } : {}),
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    // If online request fails due to network and offline sync is enabled, queue it
    if (canQueueOffline && FEATURE_FLAGS.PWA_OFFLINE_SYNC) {
      await enqueue(fullUrl, method, bodyStr, requestHeaders);
      return (body ?? {}) as T;
    }
    throw e;
  }
  clearTimeout(timeoutId);
  if (res.status === 401) {
    // The server reads the Authorization header in preference to the cookie, so a stored
    // token that has gone stale shadows a session that would still work. Drop it and let
    // the cookie answer once. Reads only -- retrying a write risks applying it twice.
    if (!isCookieRetry && !isWrite && requestHeaders['Authorization']) {
      setToken(null);
      return request<T>(path, options, true);
    }
    handleUnauthorized({ suppressEvent: suppressUnauthorizedEvent });
    const err = (await res.json().catch(() => ({}))) as { error?: string | { message?: string } };
    const errMsg = typeof err.error === 'string' ? err.error : err.error?.message;
    throw new Error(errMsg ?? 'Session expired');
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const errField = errBody?.error;
    const msg = typeof errField === 'string'
      ? errField
      : errField?.message ?? res.statusText;
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/**
 * The paging algorithm moved to `@trackvibe/shared/api` — mobile held a byte-identical copy,
 * and now there is exactly one. The web client keeps its own `request` (offline queue, cookie
 * credentials, logout event), so it simply hands that to the shared implementation.
 *
 * PAGE_LIMIT / MAX_PAGES and the reasoning behind the bound live in that module.
 */
export const requestAllPages = createRequestAllPages(
  <T>(path: string) => request<PaginatedResponse<T>>(path),
);
