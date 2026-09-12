import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransport, ApiError, type UnauthorizedContext } from '../transport';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createTransport', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('prefixes the base url and attaches a bearer token from a sync provider', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => 'tok' });

    await request('/api/thing');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://api.test/api/thing');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('awaits an async token provider', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const request = createTransport({ baseUrl: 'http://api.test', getToken: async () => 'async-tok' });

    await request('/api/thing');

    const [, init] = fetchSpy.mock.calls[0];
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer async-tok');
  });

  it('sends no Authorization header when there is no token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => null });

    await request('/api/thing');

    const [, init] = fetchSpy.mock.calls[0];
    expect((init!.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('calls onUnauthorized for a 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    const onUnauthorized = vi.fn();
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => 't', onUnauthorized });

    await expect(request('/api/thing')).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('resolves a lazy base url on every request, not once at construction', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({}));
    let base = 'http://first.test';
    const request = createTransport({ baseUrl: () => base, getToken: () => null });

    await request('/api/thing');
    base = 'http://second.test';
    await request('/api/thing');

    expect(fetchSpy.mock.calls[0][0]).toBe('http://first.test/api/thing');
    expect(fetchSpy.mock.calls[1][0]).toBe('http://second.test/api/thing');
  });

  it('sends X-Client-Platform only when a platform is configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({}));

    await createTransport({ baseUrl: 'http://api.test', getToken: () => null, platform: 'mobile' })('/a');
    await createTransport({ baseUrl: 'http://api.test', getToken: () => null })('/b');

    expect((fetchSpy.mock.calls[0][1]!.headers as Record<string, string>)['X-Client-Platform']).toBe('mobile');
    expect((fetchSpy.mock.calls[1][1]!.headers as Record<string, string>)['X-Client-Platform']).toBeUndefined();
  });

  it('defaults Content-Type to JSON, lets callers override it, but never lets them forge auth headers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({}));
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => 'tok', platform: 'mobile' });

    await request('/api/thing');
    await request('/api/thing', {
      headers: { 'Content-Type': 'text/plain', Authorization: 'Bearer forged', 'X-Client-Platform': 'forged' },
    });

    const plain = fetchSpy.mock.calls[0][1]!.headers as Record<string, string>;
    const overridden = fetchSpy.mock.calls[1][1]!.headers as Record<string, string>;
    expect(plain['Content-Type']).toBe('application/json');
    expect(overridden['Content-Type']).toBe('text/plain');
    expect(overridden.Authorization).toBe('Bearer tok');
    expect(overridden['X-Client-Platform']).toBe('mobile');
  });

  it('serialises a body only when one is given, treating null as absent', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({}));
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => null });

    await request('/a', { method: 'POST', body: { name: 'x' } });
    await request('/b', { method: 'POST', body: null });
    await request('/c');

    expect(fetchSpy.mock.calls[0][1]!.body).toBe('{"name":"x"}');
    expect('body' in fetchSpy.mock.calls[1][1]!).toBe(false);
    expect('body' in fetchSpy.mock.calls[2][1]!).toBe(false);
  });

  it('passes a configured credentials policy, and omits the key entirely when there is none', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({}));

    await createTransport({ baseUrl: 'http://api.test', getToken: () => null, credentials: 'include' })('/a');
    await createTransport({ baseUrl: 'http://api.test', getToken: () => null })('/b');
    await createTransport({ baseUrl: 'http://api.test', getToken: () => null, credentials: 'include' })('/c', { credentials: 'omit' });

    expect(fetchSpy.mock.calls[0][1]!.credentials).toBe('include');
    expect('credentials' in fetchSpy.mock.calls[1][1]!).toBe(false);
    expect(fetchSpy.mock.calls[2][1]!.credentials).toBe('omit');
  });

  it('returns undefined for a 204 and parses JSON otherwise', async () => {
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => null });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await expect(request('/a')).resolves.toBeUndefined();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ id: '1' }));
    await expect(request('/b')).resolves.toEqual({ id: '1' });
  });

  it('unwraps the API error envelope, the legacy string form, and falls back to statusText', async () => {
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => null });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'Goal not found' } }, 404),
    );
    await expect(request('/a')).rejects.toThrow('Goal not found');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: 'Too many requests' }, 429));
    await expect(request('/b')).rejects.toThrow('Too many requests');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not json', { status: 500, statusText: 'Server Error' }));
    await expect(request('/c')).rejects.toThrow('Server Error');
  });

  it('throws an ApiError that still reads as an Error and carries the status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: { message: 'Nope' } }, 403));
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => null });

    const err = await request('/a').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(403);
    expect((err as ApiError).message).toBe('Nope');
  });

  it('uses the server message on a 401, or "Session expired" when there is none', async () => {
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => 't' });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: { message: 'Token expired' } }, 401));
    await expect(request('/a')).rejects.toThrow('Token expired');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    await expect(request('/b')).rejects.toThrow('Session expired');
  });

  it('aborts after the timeout and reports it as a timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) =>
      new Promise((_resolve, reject) => {
        init!.signal!.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      }),
    );
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => null });

    await expect(request('/slow', { timeoutMs: 5 })).rejects.toThrow('Request timed out');
  });

  it('rethrows a network failure untouched', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => null });

    await expect(request('/a')).rejects.toThrow('Network request failed');
  });

  // The two clients react to a 401 in genuinely different ways. Neither may be baked in here:
  // if the transport picked one, the other would silently lose its logout path.
  describe('401 handling for both client shapes', () => {
    it("supports mobile's zero-argument handler registered through a setter", async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));

      let storedToken: string | null = 'secure-store-token';
      let onUnauthorizedCallback: (() => void) | null = null;
      const setOnUnauthorized = (cb: (() => void) | null) => { onUnauthorizedCallback = cb; };
      // Deliberately zero-argument, exactly as mobile declares it — it must stay assignable.
      const handleUnauthorized = (): void => {
        storedToken = null;
        onUnauthorizedCallback?.();
      };

      const loggedOut = vi.fn();
      setOnUnauthorized(loggedOut);
      const request = createTransport({
        baseUrl: 'http://api.test',
        getToken: async () => storedToken,
        onUnauthorized: handleUnauthorized,
        platform: 'mobile',
      });

      await expect(request('/api/thing')).rejects.toThrow('Session expired');
      expect(loggedOut).toHaveBeenCalledTimes(1);
      expect(storedToken).toBeNull();
    });

    it("supports the web's event-emitting handler and its suppressEvent option", async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));

      let inMemoryToken: string | null = 'web-token';
      const dispatchLogout = vi.fn();
      const handleUnauthorized = (opts: { suppressEvent?: boolean } = {}): void => {
        inMemoryToken = null;
        if (opts.suppressEvent) return;
        dispatchLogout();
      };

      const request = createTransport({
        baseUrl: 'http://api.test',
        getToken: () => inMemoryToken,
        onUnauthorized: (ctx: UnauthorizedContext) => handleUnauthorized({ suppressEvent: ctx.suppressEvent }),
        platform: 'web',
        credentials: 'include',
      });

      await expect(request('/api/thing')).rejects.toThrow('Session expired');
      expect(inMemoryToken).toBeNull();
      expect(dispatchLogout).toHaveBeenCalledTimes(1);

      inMemoryToken = 'web-token';
      await expect(request('/api/thing', { suppressUnauthorizedEvent: true })).rejects.toThrow('Session expired');
      expect(inMemoryToken).toBeNull();
      expect(dispatchLogout).toHaveBeenCalledTimes(1); // still 1 — the second 401 was suppressed
    });
  });
});
