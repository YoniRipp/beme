import type { ApiProfile } from '../core/api/health';

/**
 * Whether the first-run wizard still owes this user a turn.
 *
 * The web's version of this is an expression inline in a page
 * (`frontend/src/pages/Home.tsx:149`); it is a named function here because one of its
 * branches is a real defect that inline form has, and a defect needs somewhere to hang a
 * test.
 *
 * The server row is the whole source of truth, deliberately. No AsyncStorage "has
 * onboarded" flag: a device-local flag re-runs the wizard after a reinstall and skips it
 * for a user who set up in the browser, and it would be per-user state living outside the
 * database with no lifecycle story.
 */
export function shouldShowOnboarding({
  profile,
  profileLoading,
  profileError,
}: {
  profile: ApiProfile;
  profileLoading: boolean;
  profileError: string | null;
}): boolean {
  // Nothing is known yet, so nothing can be decided — otherwise every cold start flashes
  // the wizard at every user before the read that says they do not need it.
  if (profileLoading) return false;

  /**
   * A failed read is not a new account, and this line is the difference between the two.
   *
   * `useProfile` falls back to `UNLOADED_PROFILE` on error, which has no `id` and
   * `setupCompleted: false` — indistinguishable, to the rest of this expression, from the
   * brand-new user it describes. Without this guard an established account that is merely
   * offline, or behind a 500, is put through first-run setup; and because finishing the
   * wizard writes a profile, it could then overwrite its own real height and weight with
   * whatever got re-typed.
   */
  if (profileError) return false;

  // `id` absent is what `GET /api/profile` returns for a user with no row at all
  // (`backend/src/controllers/profile.ts:13`); `setupCompleted` covers the user who was
  // offered the wizard and skipped it.
  return !profile.id && !profile.setupCompleted;
}
