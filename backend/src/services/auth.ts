/**
 * Auth service -- business logic for authentication and authorization.
 */
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';
import { getPool } from '../db/pool.js';
import { withTransaction } from '../db/transaction.js';
import * as userModel from '../models/user.js';
import { publishEvent } from '../events/publish.js';
import { logger } from '../lib/logger.js';
import { kvGet, kvSet, kvDelete, kvGetAndDelete } from '../lib/keyValueStore.js';
import {
  TOKEN_BLOCKLIST_PREFIX,
  USER_BLOCKLIST_PREFIX,
  hashToken,
} from '../lib/tokenBlocklist.js';
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ServiceUnavailableError,
} from '../errors.js';
import type { User } from '../models/user.js';

const SALT_ROUNDS = 10;
// Seconds, because jsonwebtoken reads a bare number as seconds. Sourced from config so the
// JWT `exp` and the cookie's maxAge can never drift apart.
const TOKEN_EXPIRY_SECONDS = Math.floor(config.sessionTtlMs / 1000);
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;
const PKCE_TTL_MS = 5 * 60 * 1000;
const AUTH_CODE_TTL_MS = 60 * 1000;
const PKCE_PREFIX = 'pkce:';
const AUTH_CODE_PREFIX = 'authCode:';

export function generateToken(user: User): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwtSecret!,
    { expiresIn: TOKEN_EXPIRY_SECONDS }
  );
}

async function generateAuthCode(token: string): Promise<string> {
  const code = crypto.randomBytes(32).toString('hex');
  await kvSet(AUTH_CODE_PREFIX + code, JSON.stringify({ token }), AUTH_CODE_TTL_MS);
  return code;
}

async function exchangeAuthCode(code: string): Promise<string | null> {
  const raw = await kvGetAndDelete(AUTH_CODE_PREFIX + code);
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw);
    return entry?.token ?? null;
  } catch {
    return null;
  }
}

function base64UrlEncode(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function register(data: {
  email: string;
  password: string;
  name: string;
}): Promise<{ user: User; token: string }> {
  const { email, password, name } = data;

  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new ValidationError('email is required');
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new ValidationError('password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    throw new ValidationError(
      'password must contain at least one uppercase letter, one lowercase letter, and one digit'
    );
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new ValidationError('name is required');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const pool = getPool();

  try {
    const row = await withTransaction(pool, async (client) => {
      const created = await userModel.create(
        { email, passwordHash, name },
        client
      );
      return created;
    });

    const user = userModel.rowToUser(row);
    const token = generateToken(user);

    publishEvent(
      'auth.UserRegistered',
      { userId: user.id, email: user.email, name: user.name },
      user.id
    ).catch((err) => logger.error({ err }, 'Failed to publish event'));

    return { user, token };
  } catch (e: unknown) {
    const err = e as Record<string, unknown>;
    if (err.code === '23505') {
      throw new ConflictError('Email already registered');
    }
    logger.error({ err: e }, 'register error');
    throw new Error('Could not complete registration. Please try again.');
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  if (!email || typeof email !== 'string' || !password) {
    throw new ValidationError('email and password are required');
  }

  const row = await userModel.findByEmail(email);
  if (!row) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check lockout
  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    throw new ValidationError(
      'Account temporarily locked due to too many failed attempts. Please try again later.'
    );
  }

  if (!row.password_hash) {
    throw new UnauthorizedError(
      'This account uses social sign-in. Sign in with your provider instead.'
    );
  }

  const match = await bcrypt.compare(password, row.password_hash);
  if (!match) {
    const attempts = (row.failed_login_attempts || 0) + 1;
    const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await userModel.updateFailedAttempts(row.id, attempts, lockUntil);
    throw new UnauthorizedError('Invalid email or password');
  }

  if (row.failed_login_attempts > 0) {
    await userModel.clearFailedAttempts(row.id);
  }

  const user = userModel.rowToUser(row);
  const token = generateToken(user);

  publishEvent(
    'auth.UserLoggedIn',
    { userId: user.id, method: 'email' },
    user.id
  ).catch((err) => logger.error({ err }, 'Failed to publish event'));

  return { user, token };
}

export async function getUser(userId: string): Promise<User> {
  const row = await userModel.findById(userId);
  if (!row) {
    throw new NotFoundError('User not found');
  }
  return userModel.rowToUser(row);
}

/**
 * A provider that is rate-limiting us or having an outage has told us nothing about the token.
 * Collapsing that into 401 fails a VALID sign-in as if the token were forged, and gives the
 * client no reason to retry, so the transient statuses map to 503 instead.
 */
function providerVerificationError(
  status: number,
  provider: string
): UnauthorizedError | ServiceUnavailableError {
  if (status === 429 || status >= 500) {
    return new ServiceUnavailableError(
      `${provider} sign-in is temporarily unavailable. Please try again in a moment.`
    );
  }
  return new UnauthorizedError(
    `${provider} sign-in failed: token could not be verified. Please try again.`
  );
}

export async function loginWithGoogle(
  googleToken: string
): Promise<{ user: User; token: string }> {
  if (!config.googleClientId) {
    throw new ServiceUnavailableError(
      'Google sign-in is not configured (missing GOOGLE_CLIENT_ID)'
    );
  }

  if (!googleToken) {
    throw new ValidationError('token is required');
  }

  let sub: string | undefined;
  let email = '';
  let name = 'User';

  try {
    const isJwt = googleToken.split('.').length === 3;
    if (isJwt) {
      const client = new OAuth2Client(config.googleClientId);
      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: config.googleClientId,
      });
      const payload = ticket.getPayload();
      sub = payload?.sub;
      email = payload?.email || '';
      name =
        [payload?.given_name, payload?.family_name].filter(Boolean).join(' ') ||
        payload?.name ||
        email ||
        'User';
    } else {
      // An access token carries no audience of its own, so which client minted it has to be
      // asked of Google before the identity behind it is trusted: userinfo answers for a
      // token issued to ANY client with the userinfo scope, so without this check an access
      // token from an unrelated Google app signs in as that user. `aud` is the client the
      // token was issued for, `azp` the client that obtained it — they differ only when a
      // native client requests a token for its project's web client id.
      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(googleToken)}`
      );
      if (!tokenInfoRes.ok) {
        const text = await tokenInfoRes.text();
        logger.error({ status: tokenInfoRes.status, text }, 'Google tokeninfo error');
        throw providerVerificationError(tokenInfoRes.status, 'Google');
      }
      const tokenInfo = (await tokenInfoRes.json()) as Record<string, unknown>;
      const audience = tokenInfo?.aud as string | undefined;
      const authorizedParty = tokenInfo?.azp as string | undefined;
      if (
        audience !== config.googleClientId &&
        authorizedParty !== config.googleClientId
      ) {
        logger.error({ audience, authorizedParty }, 'Google token audience mismatch');
        throw new UnauthorizedError(
          'Google sign-in failed: token was not issued for this app. Please try again.'
        );
      }

      const userRes = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: `Bearer ${googleToken}` } }
      );
      if (!userRes.ok) {
        const text = await userRes.text();
        logger.error({ status: userRes.status, text }, 'Google userinfo error');
        throw providerVerificationError(userRes.status, 'Google');
      }
      const data = (await userRes.json()) as Record<string, unknown>;
      sub = data?.id as string;
      email = (data?.email as string) || '';
      name =
        [data?.given_name, data?.family_name].filter(Boolean).join(' ') ||
        (data?.name as string) ||
        email ||
        'User';
    }
  } catch (e: unknown) {
    // ServiceUnavailableError has to pass through too, or the transient case is re-collapsed
    // into the 401 this catch produces and the retry signal is lost again.
    if (e instanceof UnauthorizedError || e instanceof ServiceUnavailableError) throw e;
    logger.error({ err: e }, 'loginGoogle error');
    throw new UnauthorizedError(
      'Could not complete Google sign-in. Please try again.'
    );
  }

  if (!sub) {
    throw new UnauthorizedError(
      'Google sign-in failed: no user ID returned. Please try again.'
    );
  }

  const row = await userModel.findOrCreateProviderUser({
    authProvider: 'google',
    providerId: sub,
    email,
    name,
  });
  const user = userModel.rowToUser(row);
  const token = generateToken(user);

  publishEvent(
    'auth.UserLoggedIn',
    { userId: user.id, method: 'google' },
    user.id
  ).catch((err) => logger.error({ err }, 'Failed to publish event'));

  return { user, token };
}

export async function loginWithFacebook(
  fbToken: string
): Promise<{ user: User; token: string }> {
  // The app secret is as required as the app id: it is the other half of the app access token
  // that debug_token is authenticated with, and without that check the identity below cannot
  // be trusted at all. Refuse rather than fall back to trusting the token.
  if (!config.facebookAppId || !config.facebookAppSecret) {
    throw new ServiceUnavailableError(
      'Facebook sign-in is not configured (missing FACEBOOK_APP_ID/FACEBOOK_APP_SECRET)'
    );
  }

  if (!fbToken) {
    throw new ValidationError('token is required');
  }

  let providerId: string | undefined;
  let email = '';
  let name = 'User';

  try {
    // `graph.facebook.com/me` answers for a token minted by ANY Facebook app, so the identity
    // behind a caller-supplied token means nothing until Facebook has been asked which app the
    // token was issued for — otherwise a token obtained by an unrelated app signs in as that
    // user. debug_token is authenticated with this app's own app access token
    // (`<app_id>|<app_secret>`) and reports the issuing app in `data.app_id`.
    const appAccessToken = `${config.facebookAppId}|${config.facebookAppSecret}`;
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(fbToken)}` +
        `&access_token=${encodeURIComponent(appAccessToken)}`
    );
    if (!debugRes.ok) {
      const text = await debugRes.text();
      logger.error({ status: debugRes.status, text }, 'Facebook debug_token error');
      throw providerVerificationError(debugRes.status, 'Facebook');
    }
    const debugBody = (await debugRes.json()) as Record<string, unknown>;
    const debugData = debugBody?.data as Record<string, unknown> | undefined;
    if (debugData?.is_valid !== true || debugData?.app_id !== config.facebookAppId) {
      logger.error(
        { appId: debugData?.app_id, isValid: debugData?.is_valid },
        'Facebook token app mismatch'
      );
      throw new UnauthorizedError(
        'Facebook sign-in failed: token was not issued for this app. Please try again.'
      );
    }

    const url = 'https://graph.facebook.com/me?fields=id,email,name';
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${fbToken}` },
    });
    if (!response.ok) {
      const text = await response.text();
      logger.error({ status: response.status, text }, 'Facebook Graph error');
      throw providerVerificationError(response.status, 'Facebook');
    }
    const data = (await response.json()) as Record<string, unknown>;
    providerId = data?.id as string;
    email = (data?.email as string) || '';
    name = (data?.name as string) || email || 'User';
  } catch (e: unknown) {
    if (e instanceof UnauthorizedError || e instanceof ServiceUnavailableError) throw e;
    logger.error({ err: e }, 'loginFacebook error');
    throw new UnauthorizedError(
      'Could not complete Facebook sign-in. Please try again.'
    );
  }

  if (!providerId) {
    throw new UnauthorizedError(
      'Facebook sign-in failed: no user ID returned. Please try again.'
    );
  }

  const row = await userModel.findOrCreateProviderUser({
    authProvider: 'facebook',
    providerId,
    email,
    name,
  });
  const user = userModel.rowToUser(row);
  const token = generateToken(user);

  publishEvent(
    'auth.UserLoggedIn',
    { userId: user.id, method: 'facebook' },
    user.id
  ).catch((err) => logger.error({ err }, 'Failed to publish event'));

  return { user, token };
}

/**
 * POST /api/auth/twitter used to trust any caller-supplied bearer: `users/me` answers for a
 * token minted by ANY X application, so a token obtained by an unrelated app signed in as
 * that user here. The audience check that would close it does not exist — unlike Google's
 * `tokeninfo` and Facebook's `debug_token`, X publishes no introspection endpoint that
 * reports which client an OAuth 2.0 user access token was issued for, and inventing a
 * substitute would only look like a check.
 *
 * The supported path is the server-side authorization-code + PKCE flow already in this file:
 * `GET /api/auth/twitter/redirect` -> `GET /api/auth/twitter/callback` ->
 * `handleTwitterCallback`, where the token is minted for THIS app's client id in an exchange
 * authenticated with its client secret, so the audience is known by construction rather than
 * asserted by the caller. Nothing in `frontend/` or `mobile/` calls this endpoint — both only
 * declare an API helper no screen invokes — and `TWITTER_CLIENT_ID` ships unset, so refusing
 * removes an unauthenticated takeover primitive rather than a working feature.
 *
 * The export, the signature and the error envelope are kept so the route, the controller and
 * their tests are unaffected.
 */
export async function loginWithTwitter(
  _twitterToken: string
): Promise<{ user: User; token: string }> {
  throw new ServiceUnavailableError(
    'Twitter sign-in by access token is not supported. Use /api/auth/twitter/redirect.'
  );
}

export function getTwitterRedirectUrl(
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.twitterClientId!,
    redirect_uri: config.twitterRedirectUri || '',
    scope: 'tweet.read users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

export async function storePkce(
  state: string,
  codeVerifier: string
): Promise<void> {
  await kvSet(
    PKCE_PREFIX + state,
    JSON.stringify({ codeVerifier }),
    PKCE_TTL_MS
  );
}

export async function handleTwitterCallback(
  code: string,
  state: string
): Promise<{ user: User; token: string; authCode: string }> {
  const raw = await kvGet(PKCE_PREFIX + state);
  await kvDelete(PKCE_PREFIX + state);

  let stored: { codeVerifier: string } | null = null;
  if (raw) {
    try {
      stored = JSON.parse(raw);
    } catch {
      stored = null;
    }
  }

  if (!code || !stored?.codeVerifier) {
    throw new ValidationError('twitter_callback_failed');
  }

  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${encodeURIComponent(config.twitterClientId || '')}:${encodeURIComponent(config.twitterClientSecret || '')}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.twitterRedirectUri || '',
      code_verifier: stored.codeVerifier,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    logger.error(
      { status: tokenRes.status, text },
      'Twitter token exchange error'
    );
    throw new UnauthorizedError('twitter_token_failed');
  }

  const tokenData = (await tokenRes.json()) as Record<string, unknown>;
  const accessToken = tokenData.access_token as string;
  if (!accessToken) {
    throw new UnauthorizedError('twitter_token_failed');
  }

  const userRes = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=id,name,username',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!userRes.ok) {
    throw new UnauthorizedError('twitter_user_failed');
  }

  const userData = (
    (await userRes.json()) as Record<string, unknown>
  )?.data as Record<string, unknown> | undefined;
  const providerId = userData?.id as string;
  const name =
    (userData?.name as string) ||
    (userData?.username as string) ||
    'User';
  const email = '';

  if (!providerId) {
    throw new UnauthorizedError('twitter_user_failed');
  }

  const row = await userModel.findOrCreateProviderUser({
    authProvider: 'twitter',
    providerId,
    email,
    name,
  });
  const user = userModel.rowToUser(row);
  const jwtToken = generateToken(user);

  publishEvent(
    'auth.UserLoggedIn',
    { userId: user.id, method: 'twitter' },
    user.id
  ).catch((err) => logger.error({ err }, 'Failed to publish event'));

  const authCode = await generateAuthCode(jwtToken);
  return { user, token: jwtToken, authCode };
}

export async function forgotPassword(
  email: string
): Promise<{ resetLink?: string }> {
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new ValidationError('email is required');
  }

  const row = await userModel.findByEmail(email);
  if (!row) {
    // Return empty to avoid user enumeration
    return {};
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await userModel.setResetToken(row.id, resetTokenHash, expiresAt);

  const baseUrl = (config.frontendOrigin || '').replace(/\/$/, '');
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(row.email)}`;

  try {
    const { sendMail } = await import('../lib/email.js');
    await sendMail({
      to: row.email,
      subject: 'Reset your TrackVibe password',
      html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetLink}">Reset Password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
    });
  } catch (emailErr) {
    logger.error({ err: emailErr }, 'Failed to send reset email');
  }

  return { resetLink };
}

export async function resetPassword(data: {
  token: string;
  email: string;
  password: string;
}): Promise<void> {
  const { token, email, password } = data;

  if (!token || !email || !password) {
    throw new ValidationError('token, email, and password are required');
  }
  if (password.length < 8) {
    throw new ValidationError('password must be at least 8 characters');
  }
  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw new ValidationError(
      'password must contain at least one uppercase letter, one lowercase letter, and one digit'
    );
  }

  const resetTokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  const row = await userModel.findByResetToken(email, resetTokenHash);
  if (!row) {
    throw new ValidationError('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await userModel.updatePassword(row.id, passwordHash);
}

export async function exchangeCode(
  code: string
): Promise<{ user: User; token: string }> {
  if (!code || typeof code !== 'string') {
    throw new ValidationError('Auth code is required');
  }

  const token = await exchangeAuthCode(code);
  if (!token) {
    throw new ValidationError('Invalid or expired auth code');
  }

  const payload = jwt.verify(token, config.jwtSecret!) as {
    sub?: string;
  };
  const row = await userModel.findById(payload.sub!);
  if (!row) {
    throw new NotFoundError('User not found');
  }

  const user = userModel.rowToUser(row);
  return { user, token };
}

export async function refreshToken(
  userId: string
): Promise<{ user: User; token: string }> {
  const row = await userModel.findById(userId);
  if (!row) {
    throw new NotFoundError('User not found');
  }
  const user = userModel.rowToUser(row);
  const token = generateToken(user);
  return { user, token };
}

export async function blockToken(token: string): Promise<void> {
  try {
    const payload = jwt.verify(token, config.jwtSecret!, {
      algorithms: ['HS256'],
    }) as { exp?: number };
    if (payload.exp) {
      const ttlMs = payload.exp * 1000 - Date.now();
      if (ttlMs > 0) {
        await kvSet(TOKEN_BLOCKLIST_PREFIX + hashToken(token), '1', ttlMs);
      }
    }
  } catch {
    // Token already invalid -- no need to blocklist
  }
}

/**
 * Revoke **every** token ever issued to a user, not just the one in hand.
 *
 * `blockToken` is keyed by token hash, so it can only reach the session that presented it.
 * That is right for logout — you are signing one device out — and badly wrong for account
 * deletion: `middleware/auth.ts` verifies a signature and consults a blocklist but never
 * looks the user up, so with the 365-day default TTL every *other* device that user is
 * signed in on keeps authenticating as an account that no longer exists, for up to a year.
 * Reads come back empty and writes fail with foreign-key violations.
 *
 * A single per-user key closes all of them at once, and needs no table: the blocklist entry
 * outlives the longest token that could still be in circulation and then expires itself.
 * `requireAuth` reads it in parallel with the token blocklist, so it costs no extra latency.
 *
 * Note the store's own limits: `lib/keyValueStore.ts` falls back to a per-process in-memory
 * Map when Redis is unreachable, and never throws. Revocation is therefore best-effort
 * during a Redis outage — it will hold on the process that served the request and nowhere
 * else. That is a property of the store, not of this call.
 */
export async function blockAllUserTokens(userId: string): Promise<void> {
  await kvSet(USER_BLOCKLIST_PREFIX + userId, '1', config.sessionTtlMs);
}
