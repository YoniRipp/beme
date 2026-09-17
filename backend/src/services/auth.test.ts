/**
 * Auth service: social sign-in token verification.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockVerifyIdToken = vi.fn();
const mockFindOrCreateProviderUser = vi.fn();

vi.mock('../config/index.js', () => ({
  config: {
    // Inlined rather than shared with GOOGLE_CLIENT_ID below: this factory is hoisted above
    // the module's consts, and the service reads config at import time.
    googleClientId: 'trackvibe-web.apps.googleusercontent.com',
    facebookAppId: '1234567890',
    facebookAppSecret: 'test-facebook-app-secret',
    // Set deliberately: unset, the pre-fix code refused as "not configured" and a refusal
    // test could not tell the fix from the hole it replaced.
    twitterClientId: 'test-twitter-client-id',
    twitterClientSecret: 'test-twitter-client-secret',
    jwtSecret: 'test-jwt-secret',
    sessionTtlMs: 365 * 24 * 60 * 60 * 1000,
    frontendOrigin: 'http://localhost:5173',
    isRedisConfigured: false,
  },
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken(...args: unknown[]) {
      return mockVerifyIdToken(...args);
    }
  },
}));

vi.mock('../models/user.js', () => ({
  findOrCreateProviderUser: (...args: unknown[]) => mockFindOrCreateProviderUser(...args),
  rowToUser: (row: Record<string, unknown>) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
  }),
}));

vi.mock('../db/pool.js', () => ({ getPool: () => ({ query: vi.fn() }) }));
vi.mock('../db/transaction.js', () => ({ withTransaction: vi.fn() }));
vi.mock('../events/publish.js', () => ({ publishEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../lib/keyValueStore.js', () => ({
  kvGet: vi.fn(),
  kvSet: vi.fn(),
  kvDelete: vi.fn(),
  kvGetAndDelete: vi.fn(),
}));
vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

/** Mirrors googleClientId in the config mock above. */
const GOOGLE_CLIENT_ID = 'trackvibe-web.apps.googleusercontent.com';
/** Mirrors facebookAppId in the config mock above. */
const FACEBOOK_APP_ID = '1234567890';
const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const FB_DEBUG_URL = 'https://graph.facebook.com/debug_token';
const FB_ME_URL = 'https://graph.facebook.com/me';

const { loginWithGoogle, loginWithFacebook, loginWithTwitter } = await import('./auth.js');
const { UnauthorizedError, ServiceUnavailableError } = await import('../errors.js');

const fetchMock = vi.fn();

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function errorResponse(status: number, body = 'provider error') {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body,
  };
}

/** Routes the two Facebook calls: debug_token first, then the profile lookup. */
function stubFacebook(debugData: Record<string, unknown>, profile: Record<string, unknown>) {
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).startsWith(FB_DEBUG_URL)) return jsonResponse({ data: debugData });
    if (String(url).startsWith(FB_ME_URL)) return jsonResponse(profile);
    throw new Error(`unexpected fetch: ${url}`);
  });
}

/** Routes the two Google calls the access-token branch makes. */
function stubGoogle(tokenInfo: Record<string, unknown>, userInfo: Record<string, unknown>) {
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).startsWith(TOKENINFO_URL)) return jsonResponse(tokenInfo);
    if (String(url).startsWith(USERINFO_URL)) return jsonResponse(userInfo);
    throw new Error(`unexpected fetch: ${url}`);
  });
}

function calledUrls(): string[] {
  return fetchMock.mock.calls.map((call) => String(call[0]));
}

describe('loginWithGoogle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockFindOrCreateProviderUser.mockResolvedValue({
      id: 'user-1',
      email: 'victim@example.com',
      name: 'Victim',
      role: 'user',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('access token (the web client\'s implicit flow)', () => {
    it('signs in when the token was minted for this app', async () => {
      stubGoogle(
        { aud: GOOGLE_CLIENT_ID, azp: GOOGLE_CLIENT_ID, sub: 'google-123' },
        { id: 'google-123', email: 'user@example.com', given_name: 'Real', family_name: 'User' },
      );

      const result = await loginWithGoogle('ya29.our-web-client-token');

      expect(mockFindOrCreateProviderUser).toHaveBeenCalledWith({
        authProvider: 'google',
        providerId: 'google-123',
        email: 'user@example.com',
        name: 'Real User',
      });
      expect(result.user.id).toBe('user-1');
      expect(result.token).toBeTruthy();
    });

    it('rejects a token minted for another Google app, without looking up the identity', async () => {
      stubGoogle(
        {
          aud: 'someone-elses-app.apps.googleusercontent.com',
          azp: 'someone-elses-app.apps.googleusercontent.com',
          sub: 'google-123',
        },
        { id: 'google-123', email: 'victim@example.com', name: 'Victim' },
      );

      await expect(loginWithGoogle('ya29.token-from-another-app')).rejects.toThrow(
        UnauthorizedError,
      );
      expect(calledUrls().some((url) => url.startsWith(USERINFO_URL))).toBe(false);
      expect(mockFindOrCreateProviderUser).not.toHaveBeenCalled();
    });

    it('rejects when tokeninfo reports no audience at all', async () => {
      stubGoogle({ sub: 'google-123' }, { id: 'google-123', email: 'victim@example.com' });

      await expect(loginWithGoogle('ya29.audienceless-token')).rejects.toThrow(
        UnauthorizedError,
      );
      expect(mockFindOrCreateProviderUser).not.toHaveBeenCalled();
    });

    it('reports a rate-limited tokeninfo as retryable, not as a forged token', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (String(url).startsWith(TOKENINFO_URL)) return errorResponse(429, 'rateLimitExceeded');
        throw new Error(`unexpected fetch: ${url}`);
      });

      const error = await loginWithGoogle('ya29.valid-token').catch((e) => e);

      expect(error).toBeInstanceOf(ServiceUnavailableError);
      expect(error).not.toBeInstanceOf(UnauthorizedError);
      expect(error.statusCode).toBe(503);
      expect(mockFindOrCreateProviderUser).not.toHaveBeenCalled();
    });

    it('reports a tokeninfo outage as retryable too', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (String(url).startsWith(TOKENINFO_URL)) return errorResponse(503, 'backendError');
        throw new Error(`unexpected fetch: ${url}`);
      });

      const error = await loginWithGoogle('ya29.valid-token').catch((e) => e);

      expect(error).toBeInstanceOf(ServiceUnavailableError);
      expect(error.statusCode).toBe(503);
    });

    it('still reports a rejected token as unauthorized', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (String(url).startsWith(TOKENINFO_URL)) return errorResponse(400, 'invalid_token');
        throw new Error(`unexpected fetch: ${url}`);
      });

      const error = await loginWithGoogle('ya29.forged-token').catch((e) => e);

      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.statusCode).toBe(401);
    });
  });

  describe('id token', () => {
    it('still verifies the ID-token branch against this app\'s client id', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ sub: 'google-456', email: 'idtoken@example.com', name: 'Id Token' }),
      });

      const result = await loginWithGoogle('header.payload.signature');

      expect(mockVerifyIdToken).toHaveBeenCalledWith({
        idToken: 'header.payload.signature',
        audience: GOOGLE_CLIENT_ID,
      });
      expect(result.user.id).toBe('user-1');
    });
  });
});

describe('loginWithFacebook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockFindOrCreateProviderUser.mockResolvedValue({
      id: 'user-1',
      email: 'victim@example.com',
      name: 'Victim',
      role: 'user',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('signs in when debug_token reports the token was minted for this app', async () => {
    stubFacebook(
      { app_id: FACEBOOK_APP_ID, is_valid: true, user_id: 'fb-123' },
      { id: 'fb-123', email: 'user@example.com', name: 'Real User' },
    );

    const result = await loginWithFacebook('EAA.our-app-token');

    expect(mockFindOrCreateProviderUser).toHaveBeenCalledWith({
      authProvider: 'facebook',
      providerId: 'fb-123',
      email: 'user@example.com',
      name: 'Real User',
    });
    expect(result.user.id).toBe('user-1');
    expect(result.token).toBeTruthy();
  });

  it('checks the token with debug_token before looking up the identity', async () => {
    stubFacebook(
      { app_id: FACEBOOK_APP_ID, is_valid: true, user_id: 'fb-123' },
      { id: 'fb-123', email: 'user@example.com', name: 'Real User' },
    );

    await loginWithFacebook('EAA.our-app-token');

    const urls = calledUrls();
    expect(urls[0]).toContain(FB_DEBUG_URL);
    // The app access token is this app's id and secret, not the caller's token.
    expect(urls[0]).toContain(encodeURIComponent(`${FACEBOOK_APP_ID}|test-facebook-app-secret`));
    expect(urls[0]).toContain(`input_token=${encodeURIComponent('EAA.our-app-token')}`);
    expect(urls[1]).toContain(FB_ME_URL);
  });

  it('rejects a token minted for another Facebook app, without looking up the identity', async () => {
    stubFacebook(
      { app_id: '9999999999', is_valid: true, user_id: 'fb-123' },
      { id: 'fb-123', email: 'victim@example.com', name: 'Victim' },
    );

    await expect(loginWithFacebook('EAA.token-from-another-app')).rejects.toThrow(
      UnauthorizedError,
    );
    expect(calledUrls().some((url) => url.startsWith(FB_ME_URL))).toBe(false);
    expect(mockFindOrCreateProviderUser).not.toHaveBeenCalled();
  });

  it('rejects when debug_token says the token is not valid', async () => {
    stubFacebook(
      { app_id: FACEBOOK_APP_ID, is_valid: false, user_id: 'fb-123' },
      { id: 'fb-123', email: 'victim@example.com', name: 'Victim' },
    );

    await expect(loginWithFacebook('EAA.expired-token')).rejects.toThrow(UnauthorizedError);
    expect(mockFindOrCreateProviderUser).not.toHaveBeenCalled();
  });

  it('rejects when debug_token reports no app at all', async () => {
    stubFacebook({ is_valid: true, user_id: 'fb-123' }, { id: 'fb-123', name: 'Victim' });

    await expect(loginWithFacebook('EAA.appless-token')).rejects.toThrow(UnauthorizedError);
    expect(mockFindOrCreateProviderUser).not.toHaveBeenCalled();
  });

  it('reports a rate-limited debug_token as retryable, not as a forged token', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).startsWith(FB_DEBUG_URL)) return errorResponse(429, 'rate limited');
      throw new Error(`unexpected fetch: ${url}`);
    });

    const error = await loginWithFacebook('EAA.valid-token').catch((e) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error).not.toBeInstanceOf(UnauthorizedError);
    expect(error.statusCode).toBe(503);
    expect(mockFindOrCreateProviderUser).not.toHaveBeenCalled();
  });
});

describe('loginWithTwitter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockFindOrCreateProviderUser.mockResolvedValue({
      id: 'user-1',
      email: '',
      name: 'Victim',
      role: 'user',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses a caller-supplied bearer instead of trusting users/me', async () => {
    // X publishes no introspection endpoint, so there is no way to learn which client minted
    // this token. The stub would happily hand back an identity -- the point is that the
    // service never asks for one.
    fetchMock.mockImplementation(async () =>
      jsonResponse({ data: { id: 'twitter-123', name: 'Victim', username: 'victim' } }),
    );

    const error = await loginWithTwitter('AAAA.token-from-another-app').catch((e) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect(error.statusCode).toBe(503);
    // Names the supported flow, so this is the refusal and not the "not configured" one --
    // twitterClientId is set in the config mock precisely so the two cannot be confused.
    expect(error.message).toContain('/api/auth/twitter/redirect');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockFindOrCreateProviderUser).not.toHaveBeenCalled();
  });
});
