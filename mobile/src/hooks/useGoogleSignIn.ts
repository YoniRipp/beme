import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useAuth } from '../context/AuthContext';

/**
 * Google sign-in, as the backend expects it — and loaded so that Expo Go survives.
 *
 * WHY THE NATIVE SDK AND NOT `expo-auth-session`. `loginWithGoogle`
 * (`backend/src/services/auth.ts`) accepts a token only when its `aud` OR `azp` equals the
 * server's single `GOOGLE_CLIENT_ID` — the WEB client, the same one the deployed web app
 * signs in with. A plain browser OAuth flow from a native app produces a token whose `aud`
 * and `azp` are both the PLATFORM client, so the server refuses it however it is configured.
 * This SDK takes the web client id as its server client id and has Google mint a token whose
 * `aud` is that web client, which is exactly the case the backend's comment describes:
 * "they differ only when a native client requests a token for its project's web client id."
 *
 * WHY `require` AND NOT `import`. The package resolves a TurboModule at module scope, and
 * Expo Go does not contain it. A top-level import therefore does not degrade — it takes the
 * whole app down before the first render, with
 *
 *   [runtime not ready]: Invariant Violation: TurboModuleRegistry.getEnforcing(...):
 *   'RNGoogleSignin' could not be found.
 *
 * and since `LoginScreen` renders the button, that is EVERY user on Expo Go, signed in with
 * Google or not. Verified by doing it: the app would not start on the emulator. This is the
 * hazard `mobile/CLAUDE.md` describes for `expo-speech-recognition`, and the reason nothing
 * imports that hook either.
 *
 * Deferring the require moves the failure from startup to this module's first use, where it
 * is catchable, so a build without the native module renders a disabled button and a line of
 * explanation instead of a blank screen. A dev client has the module and works normally.
 */

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

/** `undefined` = not yet attempted, `null` = attempted and absent. */
let cachedModule: GoogleSigninModule | null | undefined;

/**
 * True in Expo Go, which ships a fixed set of native modules and cannot contain this one.
 *
 * Checked BEFORE the require rather than relying on the catch below. The catch does stop the
 * app going down, but `TurboModuleRegistry.getEnforcing` reports through React Native's error
 * handler on its way out, so LogBox raises a full-screen "Uncaught Error" on every launch even
 * though the throw is handled. Not attempting the require is the only way to have neither the
 * crash nor the overlay. Verified on the emulator: with the catch alone the app ran but opened
 * behind that overlay; with this check it opens clean.
 */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function loadGoogleSignin(): GoogleSigninModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (isExpoGo()) {
    cachedModule = null;
    return cachedModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

/** Test seam — resets the one-shot cache between cases. */
export function resetGoogleSigninCacheForTests(): void {
  cachedModule = undefined;
}

interface GoogleClientIds {
  web?: string;
  ios?: string;
}

/** Exported so the guard test can assert the gate exists without rendering the hook. */
export function isBlockedByAppleGuideline(): boolean {
  return Platform.OS === 'ios';
}

export function googleClientIds(): GoogleClientIds {
  const extra = Constants.expoConfig?.extra as { googleClientId?: GoogleClientIds } | undefined;
  return extra?.googleClientId ?? {};
}

export interface UseGoogleSignIn {
  /** False when the native module is absent OR no web client id is configured. */
  isAvailable: boolean;
  /** Distinguishes the three reasons this can be off, so the caller can word itself. */
  unavailableReason: 'ios-needs-apple-signin' | 'unsupported-build' | 'not-configured' | null;
  isSigningIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
}

export function useGoogleSignIn(): UseGoogleSignIn {
  const { loginWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ids = googleClientIds();
  const hasModule = loadGoogleSignin() !== null;

  /**
   * OFF ON iOS, DELIBERATELY, and not because it cannot work there.
   *
   * App Store guideline 4.8: an app offering third-party sign-in must offer Sign in with
   * Apple as well. This codebase has `google`, `facebook` and `twitter` on the backend and
   * no Apple provider anywhere — no endpoint, no client, no Services ID. Shipping a Google
   * button on iOS before that exists is a rejection at submission, which is the worst place
   * to find out.
   *
   * `agent-os/specs/2026-09-14-1200-parity-auth-surface/shape.md` (open question 1) reached
   * this conclusion before the feature was built and recommended deferring all of it.
   * Android carries no such obligation, so the feature ships there and waits here.
   *
   * REMOVE THIS the moment an Apple provider lands — not before.
   */
  const blockedByAppleGuideline = isBlockedByAppleGuideline();
  /**
   * The WEB id is what makes this work, so its absence — not the platform one's — counts as
   * unconfigured. Without it the picker would still open and the server would then refuse
   * every token it produced, which is a worse failure than a disabled button.
   */
  const hasWebClientId = Boolean(ids.web);
  const isAvailable = hasModule && hasWebClientId && !blockedByAppleGuideline;

  const unavailableReason = blockedByAppleGuideline
    ? ('ios-needs-apple-signin' as const)
    : !hasModule
      ? ('unsupported-build' as const)
    : !hasWebClientId
      ? ('not-configured' as const)
      : null;

  useEffect(() => {
    if (!isAvailable) return;
    const mod = loadGoogleSignin();
    if (!mod) return;
    mod.GoogleSignin.configure({
      // Named `webClientId` by the library; it is Google's `serverClientId`.
      webClientId: ids.web,
      iosClientId: ids.ios,
    });
  }, [isAvailable, ids.web, ids.ios]);

  const signIn = useCallback(async () => {
    const mod = loadGoogleSignin();
    if (!mod || !ids.web) return;

    setError(null);
    setIsSigningIn(true);
    try {
      await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await mod.GoogleSignin.signIn();

      /**
       * v13+ returns a discriminated result rather than throwing on cancel. `idToken` is the
       * credential the backend verifies — NOT the access token, which would send the server
       * down its `tokeninfo` branch and fail the audience check this setup exists to satisfy.
       */
      if (result.type === 'cancelled') return;
      const idToken = result.data?.idToken;
      if (!idToken) {
        setError('Google did not return a sign-in token. Please try again.');
        return;
      }

      await loginWithGoogle(idToken);
    } catch (e) {
      if (mod.isErrorWithCode(e)) {
        // A user closing the sheet is not an error to report back at them.
        if (e.code === mod.statusCodes.SIGN_IN_CANCELLED) return;
        if (e.code === mod.statusCodes.IN_PROGRESS) return;
        if (e.code === mod.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setError('Google Play services are unavailable on this device.');
          return;
        }
      }
      setError(e instanceof Error ? e.message : 'Could not complete Google sign-in.');
    } finally {
      setIsSigningIn(false);
    }
  }, [ids.web, loginWithGoogle]);

  return { isAvailable, unavailableReason, isSigningIn, error, signIn };
}
