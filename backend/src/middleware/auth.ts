/**
 * Authentication middleware.
 */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { getPool } from '../db/pool.js';
import { isRevoked } from '../lib/tokenBlocklist.js';
import { sendError } from '../utils/response.js';


export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.token;
  if (!token) {
    return sendError(res, 401, 'Missing or invalid Authorization header', { code: 'UNAUTHORIZED' });
  }

  // MCP server: accept shared secret and impersonate a user (for Cursor MCP integration)
  if (config.mcpSecret && config.mcpUserId && typeof token === 'string') {
    // Compare the UTF-8 buffers, and size them by their BYTE lengths. String#length counts
    // UTF-16 code units, so a multi-byte token can match the secret's character count and
    // still be a different number of bytes -- timingSafeEqual then throws, outside the try
    // below, which takes the process down on an unauthenticated request.
    const tokenBytes = Buffer.from(token, 'utf8');
    const secretBytes = Buffer.from(config.mcpSecret, 'utf8');
    if (tokenBytes.length === secretBytes.length && crypto.timingSafeEqual(tokenBytes, secretBytes)) {
      req.user = { id: config.mcpUserId, email: 'mcp@local', role: 'user' };
      req.mcpAuth = true;
      return next();
    }
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret!, { algorithms: ['HS256'] }) as { sub?: string; email?: string; role?: string };

    // Both blocklists: this token (SEC3: revoked on logout/password-reset) and the whole
    // user (account deletion). Nothing here looks the user up, so the per-user entry is the
    // only thing that stops a deleted account's *other* devices.
    if (await isRevoked(token, payload.sub)) {
      return sendError(res, 401, 'Token has been revoked', { code: 'UNAUTHORIZED' });
    }

    req.user = {
      id: payload.sub!,
      email: payload.email!,
      role: payload.role!,
    };
    next();
  } catch (e) {
    return sendError(res, 401, 'Invalid or expired token', { code: 'UNAUTHORIZED' });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return sendError(res, 401, 'Authentication required', { code: 'UNAUTHORIZED' });
  }
  if (req.user.role !== 'admin') {
    return sendError(res, 403, 'Admin access required', { code: 'FORBIDDEN' });
  }
  // The role claim is only as fresh as the token, and tokens now last a year. Confirm
  // against the database so demoting an admin takes effect immediately rather than
  // whenever their current token happens to expire. Admin routes are low-traffic, so the
  // extra read costs nothing that matters.
  try {
    const pool = getPool();
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (result.rows[0]?.role !== 'admin') {
      return sendError(res, 403, 'Admin access required', { code: 'FORBIDDEN' });
    }
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * Synchronous version for backwards compatibility. Prefer getEffectiveUserIdAsync in controllers
 * when admin userId override may be used, so the target user can be validated.
 *
 * `req.effectiveUserId` is still set by the admin `?userId=` override — it outlived the
 * trainer role that once also wrote to it.
 */
export function getEffectiveUserId(req: Request): string {
  return req.effectiveUserId != null ? req.effectiveUserId : req.user!.id;
}

/**
 * Resolve effective user id (self or admin override). When admin passes userId, validates that
 * the user exists. Call this after requireAuth and set req.effectiveUserId before controllers run.
 */
export async function resolveEffectiveUserId(req: Request, res: Response, next: NextFunction) {
  const adminUserId = req.query.userId || req.body?.userId;
  if (req.user!.role !== 'admin' || !adminUserId) {
    req.effectiveUserId = req.user!.id;
    return next();
  }
  // Validate UUID format to prevent invalid DB queries
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof adminUserId !== 'string' || !uuidRegex.test(adminUserId)) {
    return sendError(res, 400, 'Invalid userId format', { code: 'VALIDATION_ERROR' });
  }
  try {
    const pool = getPool();
    // The admin claim above comes from the token, which lasts a year. Confirm the caller is
    // still an admin before letting them act on someone else's data -- requireAdmin re-reads
    // the role for the same reason, but it is not in the withUser chain these routes use.
    // Only the override path pays for this; ordinary self-scoped requests still query nothing.
    const actor = await pool.query('SELECT role FROM users WHERE id = $1', [req.user!.id]);
    if (actor.rows[0]?.role !== 'admin') {
      return sendError(res, 403, 'Admin access required', { code: 'FORBIDDEN' });
    }
    const result = await pool.query('SELECT id FROM users WHERE id = $1', [adminUserId]);
    if (result.rows.length === 0) {
      return sendError(res, 404, 'User not found', { code: 'NOT_FOUND' });
    }
    req.effectiveUserId = result.rows[0].id;
    next();
  } catch (e) {
    next(e);
  }
}
