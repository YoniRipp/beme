/**
 * Account deletion — the one definition of "remove this user", shared by the admin route
 * (`DELETE /api/users/:id`) and self-service deletion (`DELETE /api/auth/account`).
 *
 * App Store Guideline 5.1.1(v) requires an app that creates accounts to let a user delete
 * theirs in-app, and requires that deletion actually delete. Three things sit outside the
 * Postgres transaction and are the difference between that being true and being a claim:
 *
 *   1. **S3 objects.** No column stores upload keys; the `users/<id>/` prefix is the only
 *      handle. See `services/storage.ts`.
 *   2. **The sessions — all of them.** `middleware/auth.ts` verifies the JWT signature and
 *      consults a blocklist; it never looks the user up. With a 365-day default TTL every
 *      device the user is signed in on keeps authenticating for up to a year unless the
 *      whole user is blocklisted, not merely the token that made this request.
 *   3. **The audit trail.** The old inline handler logged the deleted user's email into
 *      `app_logs.details` *after* deleting them, re-creating the PII the delete removed.
 *
 * Ordering is deliberate: rows first (transactional, all-or-nothing), then the object sweep,
 * then revocation, then the audit entry. The sweep cannot join the Postgres transaction, so
 * it is idempotent and re-runnable from the prefix alone; a sweep or revocation failure is
 * logged loudly but does not fail the request, because by then the account really is gone
 * and a 500 would tell the caller the opposite of the truth.
 */
import { getPool } from '../db/pool.js';
import { withTransaction } from '../db/transaction.js';
import { ConflictError, NotFoundError } from '../errors.js';
import { logger } from '../lib/logger.js';
import * as userModel from '../models/user.js';
import { logAction, logError } from './appLog.js';
import * as authService from './auth.js';
import { deleteUserFiles, userFilePrefix } from './storage.js';

/** Postgres foreign-key violation — a table still references the user we tried to remove. */
const FK_VIOLATION = '23503';

export interface DeleteAccountOptions {
  /** The account being removed. */
  userId: string;
  /**
   * Who to attribute the deletion to in `app_logs`, or null for a self-deletion.
   *
   * Null is not laziness. `app_logs.user_id` references `users(id)`, and the audit entry is
   * written after the commit, so attributing a self-deletion to the deleted user makes the
   * INSERT fail its foreign key — and `logAction` swallows insert failures, so the audit
   * record would vanish silently. Callers pass null for self-service deletion.
   */
  actorId: string | null;
  /**
   * The bearer token the request arrived with, blocklisted so it stops authenticating.
   * Only the self-service path has one; an admin holds their own token, not the subject's.
   */
  revokeToken?: string | null;
}

export interface DeleteAccountResult {
  /** Objects removed from the user's S3 prefix. 0 when S3 is unconfigured. */
  filesDeleted: number;
}

/**
 * Delete a user and everything belonging to them.
 *
 * @throws NotFoundError when no such user exists.
 * @throws ConflictError when a foreign key still references the user, i.e. the cascade
 *   migration has not run against this database.
 */
export async function deleteAccount(options: DeleteAccountOptions): Promise<DeleteAccountResult> {
  const { userId, actorId, revokeToken } = options;

  let existed: boolean;
  try {
    existed = await withTransaction(getPool(), (client) =>
      userModel.deleteWithOwnedData(userId, client),
    );
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === FK_VIOLATION) {
      logger.error({ err: e, userId }, 'delete account FK violation');
      // Deliberately says nothing about migrations: this reaches an end user on the
      // self-service path. `routes/users.ts` keeps its own admin-facing wording.
      throw new ConflictError('Could not delete this account because related records remain.');
    }
    throw e;
  }

  if (!existed) throw new NotFoundError('User not found');

  // Past this point the account is gone. Anything that fails is reported, never rethrown.

  // Every session, not just this request's. `middleware/auth.ts` does no user lookup, so a
  // per-token blocklist entry would leave the user's other devices authenticating as a
  // deleted account until their tokens expired — up to a year on the default TTL. This also
  // covers the admin path, which presents the admin's token and has none of the subject's.
  //
  // Neither call can reject: `blockToken` swallows its own errors and `lib/keyValueStore.ts`
  // falls back to a per-process in-memory Map rather than throwing when Redis is down. The
  // try/catch is defensive against that changing, not a live error path — during a Redis
  // outage revocation degrades silently to one process, and no code here can observe it.
  try {
    await authService.blockAllUserTokens(userId);
    if (revokeToken) await authService.blockToken(revokeToken);
  } catch (err) {
    logger.error({ err, userId }, 'delete account: token revocation failed');
    await logError('Account deletion could not revoke the user’s sessions', { targetId: userId });
  }

  let filesDeleted = 0;
  try {
    filesDeleted = await deleteUserFiles(userId);
  } catch (err) {
    // `deleteUserFiles` attempts the whole prefix and attaches the count it *did* delete to
    // the error (services/storage.ts:120-121). Leaving this at 0 audited a partial sweep as
    // having removed nothing, which is the opposite of what an operator re-running it needs.
    const partial = (err as { deleted?: unknown }).deleted;
    if (typeof partial === 'number') filesDeleted = partial;
    logger.error({ err, userId }, 'delete account: S3 sweep failed');
    // The prefix is in the message on purpose — with the user row gone it is the only thing
    // left to re-run the sweep from.
    await logError('Account deletion could not empty the user file prefix', {
      targetId: userId,
      prefix: userFilePrefix(userId),
    });
  }

  // No email, no name. The whole point of the redaction inside the transaction is undone if
  // the audit entry writes the address straight back into `app_logs.details`.
  await logAction('User deleted', { targetId: userId, filesDeleted }, actorId);

  return { filesDeleted };
}
