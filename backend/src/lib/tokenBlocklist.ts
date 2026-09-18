/**
 * Token revocation — the one definition of "this credential no longer authenticates".
 *
 * Nothing in this codebase looks a user up while authenticating: `middleware/auth.ts` and
 * `ws/voiceStreaming.ts` both verify a JWT signature and stop there. With the 365-day
 * default session TTL that makes these two blocklists the only thing standing between a
 * revoked credential and a year of continued access, so every place that authenticates a
 * token has to consult both — hence one module rather than a prefix string copied around.
 *
 * - **Token blocklist** — one entry per token hash. Written on logout and password reset.
 *   Reaches exactly the session that presented that token, which is what signing one device
 *   out means.
 * - **User blocklist** — one entry per user id. Written on account deletion, where "the
 *   session that made the request" is the wrong unit: every device the user was signed in
 *   on has to stop working, and an admin deleting someone else's account never holds their
 *   token at all.
 *
 * Both entries expire on their own, so neither grows without bound: the token entry outlives
 * its token's `exp`, the user entry outlives the longest token that could still exist.
 *
 * Note the store's limits: `keyValueStore.ts` falls back to a per-process in-memory Map when
 * Redis is unreachable and never throws, so revocation is best-effort during an outage — it
 * holds on the process that served the write and nowhere else.
 */
import crypto from 'crypto';
import { kvGet } from './keyValueStore.js';

export const TOKEN_BLOCKLIST_PREFIX = 'blocked:';
export const USER_BLOCKLIST_PREFIX = 'blockedUser:';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * True when this token, or the user it belongs to, has been revoked.
 *
 * Both lookups are issued together so the second costs no extra latency — this runs on
 * every authenticated request.
 */
export async function isRevoked(token: string, userId: string | undefined): Promise<boolean> {
  const [blockedToken, blockedUser] = await Promise.all([
    kvGet(TOKEN_BLOCKLIST_PREFIX + hashToken(token)),
    userId ? kvGet(USER_BLOCKLIST_PREFIX + userId) : Promise.resolve(null),
  ]);
  return Boolean(blockedToken || blockedUser);
}
