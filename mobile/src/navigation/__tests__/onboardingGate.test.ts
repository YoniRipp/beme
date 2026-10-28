import { shouldShowOnboarding } from '../onboardingGate';
import { UNLOADED_PROFILE } from '../../hooks/useProfile';
import type { ApiProfile } from '../../core/api/health';

/**
 * Whether first run is still ahead of this user.
 *
 * A free function rather than an expression inside `RootNavigator`, because every case
 * below is a state the navigator cannot be put into from a test without mounting the whole
 * app — and one of them is a bug that would otherwise only show up in front of a real user
 * on a bad connection.
 */

/** What `GET /api/profile` returns for an account with no row (`controllers/profile.ts:13`). */
const NO_ROW: ApiProfile = {
  setupCompleted: false,
  waterGoalGlasses: 8,
  cycleTrackingEnabled: false,
};

const loaded = (profile: ApiProfile) => ({
  profile,
  profileLoading: false,
  profileError: null,
});

describe('shouldShowOnboarding', () => {
  it('shows the wizard to an account that has no profile row yet', () => {
    expect(shouldShowOnboarding(loaded(NO_ROW))).toBe(true);
  });

  /**
   * The row exists, so this user has been through setup somewhere — including on the web,
   * which is the case that makes a device-local "seen onboarding" flag the wrong design.
   */
  it('does not show it to an account that already has a profile', () => {
    expect(shouldShowOnboarding(loaded({ ...NO_ROW, id: 'profile-1' }))).toBe(false);
  });

  // Skipping writes `setupCompleted: true` and nothing else, which is exactly what makes
  // "was asked and declined" distinguishable from "never asked".
  it('does not show it again to someone who skipped it', () => {
    expect(shouldShowOnboarding(loaded({ ...NO_ROW, setupCompleted: true }))).toBe(false);
  });

  /**
   * Nothing is known yet, so nothing can be decided. Showing the wizard here would flash it
   * at every user on every cold start, before the read that says they do not need it.
   */
  it('decides nothing while the profile is still loading', () => {
    expect(
      shouldShowOnboarding({ profile: UNLOADED_PROFILE, profileLoading: true, profileError: null })
    ).toBe(false);
  });

  /**
   * THE BUG THIS EXISTS FOR. The spec's gate is
   * `!profileLoading && !profile.id && !profile.setupCompleted`, transcribed from
   * `frontend/src/pages/Home.tsx:149` — and on a failed read `useProfile` falls back to
   * `UNLOADED_PROFILE`, which has no `id` and `setupCompleted: false`. So that expression
   * takes a five-year-old account that is merely offline, or behind a 500, and puts it
   * through first-run setup.
   *
   * It is worse than a cosmetic wrong screen: finishing that wizard writes a profile, so a
   * user could overwrite their real height and weight with whatever they re-typed.
   */
  it('does not mistake a failed read for a brand-new account', () => {
    expect(
      shouldShowOnboarding({
        profile: UNLOADED_PROFILE,
        profileLoading: false,
        profileError: 'Network request failed',
      })
    ).toBe(false);
  });
});
