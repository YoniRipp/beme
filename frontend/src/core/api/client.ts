/// <reference types="vite/client" />

import { STORAGE_KEYS } from '@/lib/storage';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { enqueue } from '@/lib/syncQueue';

const API_BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
  || (typeof window !== 'undefined' ? `http://${window.location.hostname}:3000` : '');

const DEFAULT_TIMEOUT_MS = 30000;

export function getApiBase(): string {
  return API_BASE;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token == null) localStorage.removeItem(STORAGE_KEYS.TOKEN);
    else localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } catch {
    // ignore
  }
}

/** Call this when the API returns 401 so auth state is cleared and UI can redirect. */
export function handleUnauthorized(): void {
  setToken(null);
  try {
    window.dispatchEvent(new CustomEvent('auth:logout'));
  } catch {
    // ignore
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  headers?: HeadersInit;
  body?: unknown;
  timeoutMs?: number;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const token = getToken();
  const authHeaders: HeadersInit = token ? { ...headers, Authorization: `Bearer ${token}` } : { ...headers };
  const isMutation = method !== 'GET';
  const fullUrl = `${API_BASE}${path}`;
  const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders } as Record<string, string>;
  const bodyStr = body != null ? JSON.stringify(body) : null;

  // Offline queue: enqueue mutations when offline instead of failing
  if (isMutation && !navigator.onLine && FEATURE_FLAGS.PWA_OFFLINE_SYNC) {
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
    if (isMutation && FEATURE_FLAGS.PWA_OFFLINE_SYNC) {
      await enqueue(fullUrl, method, bodyStr, requestHeaders);
      return (body ?? {}) as T;
    }
    throw e;
  }
  clearTimeout(timeoutId);
  if (res.status === 401) {
    handleUnauthorized();
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'Session expired');
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
