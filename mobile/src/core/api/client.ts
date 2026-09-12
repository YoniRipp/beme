import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const STORAGE_KEY = 'trackvibe_token';

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Carries the HTTP status alongside the message. Still an `Error`, so every existing
 * `catch` and `instanceof Error` check behaves exactly as before; the status is what lets
 * a caller tell "retrying might help" from "retrying definitely won't".
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function getApiBase(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
}

export function getApiBaseUrl(): string {
  return getApiBase();
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  try {
    if (token == null) await SecureStore.deleteItemAsync(STORAGE_KEY);
    else await SecureStore.setItemAsync(STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

/** Callback set by auth context; invoked on 401 so UI can logout. */
let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorized(cb: (() => void) | null): void {
  onUnauthorizedCallback = cb;
}

export function handleUnauthorized(): void {
  setToken(null);
  onUnauthorizedCallback?.();
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  headers?: HeadersInit;
  body?: unknown;
  timeoutMs?: number;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const token = await getToken();
  const authHeaders: HeadersInit = token
    ? { ...headers, Authorization: `Bearer ${token}`, 'X-Client-Platform': 'mobile' }
    : { ...headers, 'X-Client-Platform': 'mobile' };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      method,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      ...(body != null ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw e;
  }
  clearTimeout(timeoutId);
  if (res.status === 401) {
    handleUnauthorized();
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(err.error ?? 'Session expired', 401);
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(err.error ?? res.statusText, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
