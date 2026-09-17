/**
 * Token blocklist lookup (SEC3: revoked tokens on logout/password-reset).
 *
 * The revoke path in services/auth.ts writes `blocked:<sha256(token)>` into the
 * KV store. Every entry point that accepts a JWT -- the HTTP middleware and the
 * voice WebSocket -- has to read the same key, so the prefix and the hashing
 * live here rather than being re-derived at each call site.
 */
import crypto from 'crypto';
import { kvGet } from './keyValueStore.js';

export const TOKEN_BLOCKLIST_PREFIX = 'blocked:';

/** True when this token has been revoked (logout / password reset). */
export async function isTokenRevoked(token: string): Promise<boolean> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const blocked = await kvGet(TOKEN_BLOCKLIST_PREFIX + tokenHash);
  return Boolean(blocked);
}
