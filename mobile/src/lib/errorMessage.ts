import { ApiError } from '../core/api/client';

/**
 * What to show a user when a save fails.
 *
 * Every form on this client caught with a bare `} catch {` and showed a fixed sentence —
 * "Failed to save", "Could not save weight", "Failed to save goal". The API's own message was
 * discarded at the one moment it was worth having: a 400 naming the field that is wrong became
 * an unactionable line, and the user's only remaining move is to try the same thing again.
 *
 * Everything reaching these handlers is already an `ApiError` carrying the server's message
 * (`packages/shared/src/api/transport.ts` throws it). The fallback stays for the cases that are
 * not — a network drop, a JSON parse failure — where the server said nothing to relay.
 */
export function messageFor(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback;
}
