/**
 * Auth service: Google sign-in token verification.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockVerifyIdToken = vi.fn();
const mockFindOrCreateProviderUser = vi.fn();

vi.mock('../config/index.js', () => ({
  config: {
    // Inlined rather than shared with GOOGLE_CLIENT_ID below: this factory is hoisted above
    // the module's consts, and the service reads config at import time.
    googleClientId: 'trackvibe-web.apps.googleusercontent.com',
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
const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const { loginWithGoogle } = await import('./auth.js');
const { UnauthorizedError } = await import('../errors.js');

const fetchMock = vi.fn();

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
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
