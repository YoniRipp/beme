/**
 * Auth routes: register, login, OAuth, me.
 */
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { Router, Request, Response } from 'express';
import { config } from '../config/index.js';
import { getPool } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { publishEvent } from '../events/publish.js';
import { logger } from '../lib/logger.js';
import { kvGet, kvSet, kvDelete, kvGetAndDelete } from '../lib/keyValueStore.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';
const PKCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const AUTH_CODE_TTL_MS = 60 * 1000; // 1 minute - auth codes are short-lived
const PKCE_PREFIX = 'pkce:';
const AUTH_CODE_PREFIX = 'authCode:';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

function setTokenCookie(res: Response, token: string) {
  res.cookie('token', token, COOKIE_OPTIONS);
}

function clearTokenCookie(res: Response) {
  res.clearCookie('token', { path: '/' });
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

function rowToUser(row: Record<string, any>) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
    subscriptionStatus: row.subscription_status || 'free',
    subscriptionCurrentPeriodEnd: row.subscription_current_period_end || null,
  };
}

async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body ?? {};
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ error: 'password must contain at least one uppercase letter, one lowercase letter, and one digit' });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, name, role, created_at, subscription_status, subscription_current_period_end`,
      [email.trim().toLowerCase(), password_hash, name.trim()]
    );
    const user = rowToUser(result.rows[0]);
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      config.jwtSecret!,
      { expiresIn: TOKEN_EXPIRY }
    );
    publishEvent('auth.UserRegistered', { userId: user.id, email: user.email, name: user.name }, user.id).catch(err => logger.error({ err }, 'Failed to publish event'));
    setTokenCookie(res, token);
    res.status(201).json({ user, token });
  } catch (e: unknown) {
    const err = e as Record<string, unknown>;
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    logger.error({ err: e }, 'register error');
    res.status(500).json({ error: (e instanceof Error ? e.message : undefined) ?? 'Could not complete registration. Please try again.' });
  }
}

async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body ?? {};
    if (!email || typeof email !== 'string' || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, email, name, role, password_hash, auth_provider, provider_id, subscription_status, subscription_current_period_end, failed_login_attempts, locked_until FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const row = result.rows[0];
    // Check lockout
    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      return res.status(429).json({ error: 'Account temporarily locked due to too many failed attempts. Please try again later.' });
    }
    if (!row.password_hash) {
      return res.status(401).json({ error: 'This account uses social sign-in. Sign in with your provider instead.' });
    }
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      const attempts = (row.failed_login_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await pool.query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
        [attempts, lockUntil, row.id]
      );
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (row.failed_login_attempts > 0) {
      await pool.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [row.id]);
    }
    const user = rowToUser(row);
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      config.jwtSecret!,
      { expiresIn: TOKEN_EXPIRY }
    );
    publishEvent('auth.UserLoggedIn', { userId: user.id, method: 'email' }, user.id).catch(err => logger.error({ err }, 'Failed to publish event'));
    setTokenCookie(res, token);
    res.json({ user, token });
  } catch (e: unknown) {
    logger.error({ err: e }, 'login error');
    res.status(500).json({ error: (e instanceof Error ? e.message : undefined) ?? 'Could not sign in. Please try again.' });
  }
}

async function me(req: Request, res: Response) {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, email, name, role, created_at, subscription_status, subscription_current_period_end FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rowToUser(result.rows[0]));
  } catch (e: unknown) {
    logger.error({ err: e }, 'me error');
    res.status(500).json({ error: (e instanceof Error ? e.message : undefined) ?? 'Could not get user. Please try again.' });
  }
}

async function findOrCreateProviderUser(pool: ReturnType<typeof getPool>, { authProvider, providerId, email, name }: { authProvider: string; providerId: string; email: string; name: string }) {
  const emailNorm = email ? email.trim().toLowerCase() : '';
  const nameTrim = name ? name.trim() : 'Unknown';
  if (!emailNorm && !providerId) {
    throw new Error('email or provider_id required');
  }
  let result = await pool.query(
    'SELECT id, email, name, role, created_at, subscription_status, subscription_current_period_end FROM users WHERE auth_provider = $1 AND provider_id = $2',
    [authProvider, providerId]
  );
  if (result.rows.length > 0) {
    const row = result.rows[0];
    const user = rowToUser(row);
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      config.jwtSecret!,
      { expiresIn: TOKEN_EXPIRY }
    );
    return { user, token };
  }
  if (emailNorm) {
    result = await pool.query(
      'SELECT id, email, name, role, created_at, subscription_status, subscription_current_period_end FROM users WHERE email = $1',
      [emailNorm]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      await pool.query(
        'UPDATE users SET auth_provider = $1, provider_id = $2 WHERE id = $3',
        [authProvider, providerId, row.id]
      );
      const user = rowToUser(row);
      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        config.jwtSecret!,
        { expiresIn: TOKEN_EXPIRY }
      );
      return { user, token };
    }
  }
  const insertEmail = emailNorm || `${authProvider}-${providerId}@social.local`;
  result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, auth_provider, provider_id)
     VALUES ($1, NULL, $2, 'user', $3, $4)
     RETURNING id, email, name, role, created_at, subscription_status, subscription_current_period_end`,
    [insertEmail, nameTrim, authProvider, providerId]
  );
  const user = rowToUser(result.rows[0]);
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwtSecret!,
    { expiresIn: TOKEN_EXPIRY }
  );
  return { user, token };
}

async function loginGoogle(req: Request, res: Response) {
  if (!config.googleClientId) {
    return res.status(503).json({ error: 'Google sign-in is not configured (missing GOOGLE_CLIENT_ID)' });
  }
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }
    let sub;
    let email = '';
    let name = 'User';
    const isJwt = token.split('.').length === 3;
    if (isJwt) {
      const client = new OAuth2Client(config.googleClientId);
      const ticket = await client.verifyIdToken({ idToken: token, audience: config.googleClientId });
      const payload = ticket.getPayload();
      sub = payload?.sub;
      email = payload?.email || '';
      name = [payload?.given_name, payload?.family_name].filter(Boolean).join(' ') || payload?.name || email || 'User';
    } else {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!userRes.ok) {
        const text = await userRes.text();
        logger.error({ status: userRes.status, text }, 'Google userinfo error');
        return res.status(401).json({ error: 'Google sign-in failed: token could not be verified. Please try again.' });
      }
      const data = (await userRes.json()) as Record<string, unknown>;
      sub = data?.id as string;
      email = (data?.email as string) || '';
      name = [data?.given_name, data?.family_name].filter(Boolean).join(' ') || (data?.name as string) || email || 'User';
    }
    if (!sub) {
      return res.status(401).json({ error: 'Google sign-in failed: no user ID returned. Please try again.' });
    }
    const pool = getPool();
    const { user, token: jwtToken } = await findOrCreateProviderUser(pool, {
      authProvider: 'google',
      providerId: sub,
      email,
      name,
    });
    publishEvent('auth.UserLoggedIn', { userId: user.id, method: 'google' }, user.id).catch(err => logger.error({ err }, 'Failed to publish event'));
    setTokenCookie(res, jwtToken);
    res.json({ user, token: jwtToken });
  } catch (e: unknown) {
    logger.error({ err: e }, 'loginGoogle error');
    res.status(401).json({ error: (e instanceof Error ? e.message : undefined) ?? 'Could not complete Google sign-in. Please try again.' });
  }
}

async function loginFacebook(req: Request, res: Response) {
  if (!config.facebookAppId) {
    return res.status(503).json({ error: 'Facebook sign-in is not configured (missing FACEBOOK_APP_ID)' });
  }
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }
    const url = 'https://graph.facebook.com/me?fields=id,email,name';
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const text = await response.text();
      logger.error({ status: response.status, text }, 'Facebook Graph error');
      return res.status(401).json({ error: 'Facebook sign-in failed: token could not be verified. Please try again.' });
    }
    const data = (await response.json()) as Record<string, unknown>;
    const providerId = data?.id as string;
    const email = (data?.email as string) || '';
    const name = (data?.name as string) || email || 'User';
    if (!providerId) {
      return res.status(401).json({ error: 'Facebook sign-in failed: no user ID returned. Please try again.' });
    }
    const pool = getPool();
    const { user, token: jwtToken } = await findOrCreateProviderUser(pool, {
      authProvider: 'facebook',
      providerId,
      email,
      name,
    });
    publishEvent('auth.UserLoggedIn', { userId: user.id, method: 'facebook' }, user.id).catch(err => logger.error({ err }, 'Failed to publish event'));
    setTokenCookie(res, jwtToken);
    res.json({ user, token: jwtToken });
  } catch (e: unknown) {
    logger.error({ err: e }, 'loginFacebook error');
    res.status(401).json({ error: (e instanceof Error ? e.message : undefined) ?? 'Could not complete Facebook sign-in. Please try again.' });
  }
}

async function loginTwitter(req: Request, res: Response) {
  if (!config.twitterClientId) {
    return res.status(503).json({ error: 'Twitter sign-in is not configured (missing TWITTER_CLIENT_ID)' });
  }
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }
    const response = await fetch('https://api.twitter.com/2/users/me?user.fields=id,name,username', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const text = await response.text();
      logger.error({ status: response.status, text }, 'Twitter API error');
      return res.status(401).json({ error: 'Invalid Twitter token' });
    }
    const data = (await response.json()) as Record<string, unknown>;
    const userData = data?.data as Record<string, unknown> | undefined;
    const providerId = userData?.id as string | undefined;
    const name = (userData?.name as string) || (userData?.username as string) || 'User';
    const email = '';
    if (!providerId) {
      return res.status(401).json({ error: 'Twitter sign-in failed: no user ID returned. Please try again.' });
    }
    const pool = getPool();
    const { user, token: jwtToken } = await findOrCreateProviderUser(pool, {
      authProvider: 'twitter',
      providerId,
      email,
      name,
    });
    publishEvent('auth.UserLoggedIn', { userId: user.id, method: 'twitter' }, user.id).catch(err => logger.error({ err }, 'Failed to publish event'));
    setTokenCookie(res, jwtToken);
    res.json({ user, token: jwtToken });
  } catch (e: unknown) {
    logger.error({ err: e }, 'loginTwitter error');
    res.status(401).json({ error: (e instanceof Error ? e.message : undefined) ?? 'Could not complete Twitter sign-in. Please try again.' });
  }
}

function base64UrlEncode(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function twitterRedirect(req: Request, res: Response) {
  if (!config.twitterClientId) {
    return res.status(503).send('Twitter sign-in is not configured');
  }
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = base64UrlEncode(
    crypto.createHash('sha256').update(codeVerifier).digest()
  );
  await kvSet(PKCE_PREFIX + state, JSON.stringify({ codeVerifier }), PKCE_TTL_MS);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.twitterClientId,
    redirect_uri: config.twitterRedirectUri || '',
    scope: 'tweet.read users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  res.redirect(`https://twitter.com/i/oauth2/authorize?${params.toString()}`);
}

async function twitterCallback(req: Request, res: Response) {
  const { code, state } = req.query ?? {};
  const raw = state && typeof state === 'string' ? await kvGet(PKCE_PREFIX + state) : null;
  if (state && typeof state === 'string') await kvDelete(PKCE_PREFIX + state);
  let stored: { codeVerifier: string } | null = null;
  if (raw) {
    try {
      stored = JSON.parse(raw);
    } catch {
      stored = null;
    }
  }
  if (!code || typeof code !== 'string' || !stored?.codeVerifier) {
    return res.redirect(`${config.frontendOrigin}/login?error=twitter_callback_failed`);
  }
  try {
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
      logger.error({ status: tokenRes.status, text }, 'Twitter token exchange error');
      return res.redirect(`${config.frontendOrigin}/login?error=twitter_token_failed`);
    }
    const tokenData = (await tokenRes.json()) as Record<string, unknown>;
    const accessToken = tokenData.access_token as string;
    if (!accessToken) {
      return res.redirect(`${config.frontendOrigin}/login?error=twitter_token_failed`);
    }
    const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=id,name,username', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      return res.redirect(`${config.frontendOrigin}/login?error=twitter_user_failed`);
    }
    const userData = ((await userRes.json()) as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    const providerId = userData?.id as string;
    const name = (userData?.name as string) || (userData?.username as string) || 'User';
    const email = '';
    if (!providerId) {
      return res.redirect(`${config.frontendOrigin}/login?error=twitter_user_failed`);
    }
    const pool = getPool();
    const { user, token: jwtToken } = await findOrCreateProviderUser(pool, {
      authProvider: 'twitter',
      providerId,
      email,
      name,
    });
    publishEvent('auth.UserLoggedIn', { userId: user.id, method: 'twitter' }, user.id).catch(err => logger.error({ err }, 'Failed to publish event'));
    const authCode = await generateAuthCode(jwtToken);
    const redirectUrl = `${config.frontendOrigin}/auth/callback?code=${encodeURIComponent(authCode)}`;
    res.redirect(redirectUrl);
  } catch (e: unknown) {
    logger.error({ err: e }, 'twitterCallback error');
    res.redirect(`${config.frontendOrigin}/login?error=twitter_callback_failed`);
  }
}

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body ?? {};
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'email is required' });
    }
    const pool = getPool();
    const result = await pool.query('SELECT id, email FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    // Always return success to avoid user enumeration
    if (result.rows.length === 0) {
      return res.json({ message: 'If an account exists, a reset link has been sent.' });
    }
    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
    await pool.query(
      'UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3',
      [resetTokenHash, expiresAt, user.id]
    );
    const baseUrl = (config.frontendOrigin || '').replace(/\/$/, '');
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
    try {
      const { sendMail } = await import('../lib/email.js');
      await sendMail({
        to: user.email,
        subject: 'Reset your BeMe password',
        html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetLink}">Reset Password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
    } catch (emailErr) {
      logger.error({ err: emailErr }, 'Failed to send reset email');
    }
    res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (e: unknown) {
    logger.error({ err: e }, 'forgotPassword error');
    res.status(500).json({ error: 'Could not send password reset email. Please try again.' });
  }
}

async function resetPassword(req: Request, res: Response) {
  try {
    const { token, email, password } = req.body ?? {};
    if (!token || !email || !password) {
      return res.status(400).json({ error: 'token, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ error: 'password must contain at least one uppercase letter, one lowercase letter, and one digit' });
    }
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const pool = getPool();
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND reset_token_hash = $2 AND reset_token_expires > NOW()',
      [email.trim().toLowerCase(), resetTokenHash]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    const userId = result.rows[0].id;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, userId]
    );
    res.json({ message: 'Password has been reset successfully' });
  } catch (e: unknown) {
    logger.error({ err: e }, 'resetPassword error');
    res.status(500).json({ error: 'Could not reset password. Please try again.' });
  }
}

async function exchangeCode(req: Request, res: Response) {
  try {
    const { code } = req.body ?? {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Auth code is required' });
    }
    const token = await exchangeAuthCode(code);
    if (!token) {
      return res.status(400).json({ error: 'Invalid or expired auth code' });
    }
    const payload = jwt.verify(token, config.jwtSecret!);
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, email, name, role, created_at, subscription_status, subscription_current_period_end FROM users WHERE id = $1',
      [(payload as { sub?: string }).sub]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    setTokenCookie(res, token);
    res.json({ user: rowToUser(rows[0]), token });
  } catch (e: unknown) {
    logger.error({ err: e }, 'exchangeCode error');
    res.status(400).json({ error: 'Invalid auth code' });
  }
}

function logout(_req: Request, res: Response) {
  clearTokenCookie(res);
  res.json({ message: 'Logged out' });
}

const router = Router();
router.post('/api/auth/register', register);
router.post('/api/auth/login', login);
router.post('/api/auth/google', loginGoogle);
router.post('/api/auth/facebook', loginFacebook);
router.post('/api/auth/twitter', loginTwitter);
router.get('/api/auth/twitter/redirect', twitterRedirect);
router.get('/api/auth/twitter/callback', twitterCallback);
router.post('/api/auth/exchange', exchangeCode);
router.get('/api/auth/me', requireAuth, me);
router.post('/api/auth/forgot-password', forgotPassword);
router.post('/api/auth/reset-password', resetPassword);
router.post('/api/auth/logout', logout);

export default router;
