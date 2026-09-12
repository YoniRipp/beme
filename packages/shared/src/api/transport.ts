/**
 * The one HTTP transport both clients sit on.
 *
 * The two clients authenticate differently and must keep doing so: the web holds a bearer in
 * memory alongside an HTTP-only cookie, mobile holds one in `expo-secure-store`. So nothing
 * auth-shaped is baked in here — the token, the 401 reaction, the platform header and the
 * cookie policy are all injected by the client that creates the transport.
 *
 * Behaviour below is a faithful lift of what `mobile/src/core/api/client.ts` and
 * `frontend/src/core/api/client.ts` already do: the same 30s abort, the same
 * `'Request timed out'` message, the same `{ error }` unwrapping, the same 204 handling.
 * Do not "tidy" any of it without checking both clients first.
 */

/** Sync for the web (in-memory), async for mobile (SecureStore). Both are awaited. */
export type TokenProvider = () => string | null | Promise<string | null>;

/** What the transport tells a client when the server rejected its credentials. */
export interface UnauthorizedContext {
  /**
   * Set from `RequestOptions.suppressUnauthorizedEvent`. The web client uses it so a session
   * probe can clear auth state without broadcasting a logout to the whole app.
   */
  suppressEvent?: boolean;
}

export interface TransportConfig {
  /**
   * Origin the paths hang off. Pass a function when it is not known at module-eval time —
   * mobile reads `Constants.expoConfig` per request, so it must stay lazy.
   */
  baseUrl: string | (() => string);
  getToken: TokenProvider;
  /** Called on a 401 so the client can clear auth state and redirect. */
  onUnauthorized?: (context: UnauthorizedContext) => void;
  /** Sent as X-Client-Platform, e.g. 'mobile'. */
  platform?: string;
  /** Default cookie policy. The web passes 'include'; mobile passes nothing. */
  credentials?: 'omit' | 'same-origin' | 'include';
  defaultTimeoutMs?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  /** Per-request override of the configured cookie policy. */
  credentials?: 'omit' | 'same-origin' | 'include';
  /** Reaches the client as `UnauthorizedContext.suppressEvent`. */
  suppressUnauthorizedEvent?: boolean;
}

export type Transport = <T>(path: string, options?: RequestOptions) => Promise<T>;

/**
 * Thrown for any non-2xx response. It extends Error and carries the server's message, so the
 * screens that render `e instanceof Error ? e.message : …` keep working unchanged; `status` is
 * new information on top.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // Keeps `instanceof` honest if a bundler downlevels the class (Metro/Babel).
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

const DEFAULT_TIMEOUT_MS = 30000;

function resolveBaseUrl(baseUrl: TransportConfig['baseUrl']): string {
  return typeof baseUrl === 'function' ? baseUrl() : baseUrl;
}

/**
 * The API's error envelope is `{ error: { code, message } }` (see backend/response-format);
 * a few older paths still send `{ error: 'text' }`. Both are unwrapped to a plain string.
 */
function errorMessageFrom(payload: unknown): string | undefined {
  const error = (payload as { error?: unknown } | null | undefined)?.error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return undefined;
}

export function createTransport(config: TransportConfig): Transport {
  return async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers, suppressUnauthorizedEvent } = options;
    const timeoutMs = options.timeoutMs ?? config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    const credentials = options.credentials ?? config.credentials;

    const token = await config.getToken();

    // Precedence is the clients' existing one: a caller may override Content-Type, but never
    // the Authorization or platform headers the transport owns.
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (token) requestHeaders['Authorization'] = `Bearer ${token}`;
    if (config.platform) requestHeaders['X-Client-Platform'] = config.platform;

    // `!= null` on purpose: an explicit `null` body means "send no body", as it always has.
    const bodyStr = body != null ? JSON.stringify(body) : null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let res: Awaited<ReturnType<typeof fetch>>;
    try {
      res = await fetch(`${resolveBaseUrl(config.baseUrl)}${path}`, {
        method,
        signal: controller.signal,
        headers: requestHeaders,
        ...(credentials ? { credentials } : {}),
        ...(bodyStr != null ? { body: bodyStr } : {}),
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
      config.onUnauthorized?.({ suppressEvent: suppressUnauthorizedEvent });
      const payload = await res.json().catch(() => ({}));
      throw new ApiError(errorMessageFrom(payload) ?? 'Session expired', 401);
    }
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new ApiError(errorMessageFrom(payload) ?? res.statusText, res.status);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  };
}
