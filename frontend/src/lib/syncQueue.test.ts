import { describe, it, expect, afterEach, vi } from 'vitest';
import { replayOutcome, replayHeaders, setAuthTokenProvider } from './syncQueue';

/**
 * The replay policy, which had no tests at all — and neither did the 202 lines around it.
 *
 * Extracted from `flush` so it can be exercised without IndexedDB or a network. It is where
 * the consequences live: get `done` wrong and a user's mutation is dropped or duplicated, get
 * `stop` wrong and the whole queue stalls behind one entry.
 */
describe('replayOutcome', () => {
  it.each([200, 201, 204, 299])('treats %i as done', (status) => {
    expect(replayOutcome(status)).toBe('done');
  });

  it('treats 409 as done, because the server already has it', () => {
    // A replay of a write that actually landed before the connection dropped. Retrying it
    // forever, or counting it a failure, both end with the queue never draining.
    expect(replayOutcome(409)).toBe('done');
  });

  it('stops the whole flush on 401 rather than burning retries', () => {
    // Re-authentication is a user action. Every following entry would 401 too, and each one
    // would spend a retry it needs for a real outage — five 401s and the mutation is deleted.
    expect(replayOutcome(401)).toBe('stop');
  });

  it.each([400, 403, 404, 422, 500, 502, 503])('retries %i', (status) => {
    expect(replayOutcome(status)).toBe('retry');
  });

  it('does not mistake 4xx neighbours of 401 and 409 for their outcomes', () => {
    // The two special cases are exact matches, not ranges — a 400 is not an auth problem and
    // a 410 is not a conflict.
    expect(replayOutcome(400)).toBe('retry');
    expect(replayOutcome(402)).toBe('retry');
    expect(replayOutcome(408)).toBe('retry');
    expect(replayOutcome(410)).toBe('retry');
  });

  it('does not treat a 3xx as success', () => {
    // `res.ok` is 200-299. A redirect is not a completed write.
    expect(replayOutcome(301)).toBe('retry');
    expect(replayOutcome(304)).toBe('retry');
  });
});

/**
 * The credential a replay carries — the bug this module actually had.
 *
 * It sent neither a bearer token nor a usable cookie. The cookie is `sameSite: 'strict'`
 * (`backend/src/controllers/auth.ts`), so it is not sent when the app and API are not
 * same-site, which is the production arrangement and the stated reason `client.ts` keeps a
 * mirrored in-memory token at all. So every replay 401'd, `replayOutcome` said stop, and the
 * queue never drained — after the user had been told the write succeeded.
 */
describe('replayHeaders', () => {
  afterEach(() => setAuthTokenProvider(() => null));

  it('always identifies the client and the content type', () => {
    setAuthTokenProvider(() => null);
    expect(replayHeaders()).toMatchObject({
      'Content-Type': 'application/json',
      'X-Client-Platform': 'web',
    });
  });

  it('attaches the bearer token, which is what the replay used to be missing', () => {
    setAuthTokenProvider(() => 'tok-123');
    expect(replayHeaders().Authorization).toBe('Bearer tok-123');
  });

  it('reads the token at replay time, not at enqueue time', () => {
    // The reason the token is not stored beside the queued request: an entry can sit for days
    // and across a re-login, so a copy saved at enqueue would be stale exactly when used.
    let current = 'first';
    setAuthTokenProvider(() => current);
    expect(replayHeaders().Authorization).toBe('Bearer first');

    current = 'second';
    expect(replayHeaders().Authorization).toBe('Bearer second');
  });

  it('omits the header entirely when there is no token, rather than sending "Bearer null"', () => {
    setAuthTokenProvider(() => null);
    expect(replayHeaders()).not.toHaveProperty('Authorization');
  });

  it('warns loudly when nothing registered a provider at all', () => {
    // A logged-out user having no token is normal and silent. NOTHING having registered a
    // provider means replays are unauthenticated again — the original bug, and it hid for
    // exactly as long as it made no noise.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setAuthTokenProvider(null);

    expect(replayHeaders()).not.toHaveProperty('Authorization');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no auth token provider'));

    warn.mockRestore();
  });
});
