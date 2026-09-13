import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { createTransport } from '@trackvibe/shared/api';

// The HTTP plumbing lives in @trackvibe/shared/api. NOTE: this client is currently its only
// consumer -- the web client deliberately keeps its own `request`, because it carries an
// offline sync queue, cookie credentials and a logout event with no mobile counterpart (see
// frontend/src/core/api/client.ts:121-127). The two clients share the PAGING algorithm, not
// the transport, so a change here does not change web behaviour and is not covered by the
// web's tests. Everything auth-shaped stays here: the token lives in SecureStore (so it
// survives a cold start, unlike the web's in-memory bearer) and the 401 reaction is this
// app's own. The public surface of this module is unchanged.

export type { RequestOptions } from '@trackvibe/shared/api';

const STORAGE_KEY = 'trackvibe_token';

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

export const request = createTransport({
  // Passed as a function, not a value: `Constants.expoConfig` is read per request, as before.
  baseUrl: getApiBase,
  getToken,
  onUnauthorized: handleUnauthorized,
  platform: 'mobile',
});
