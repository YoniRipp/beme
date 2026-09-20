import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import {
  isBlockedByAppleGuideline,
  loadGoogleSignin,
  resetGoogleSigninCacheForTests,
} from '../useGoogleSignIn';

/**
 * The one behaviour worth pinning here is NOT that Google sign-in works — that needs a dev
 * client, real OAuth clients and a browser, none of which exist in Jest. It is that this
 * module stays inert where the native package is absent.
 *
 * That matters because getting it wrong took the whole app down. `@react-native-google-signin`
 * resolves a TurboModule at module scope, `LoginScreen` renders the button, so a plain
 * top-level `import` meant every Expo Go user got
 *
 *   [runtime not ready]: Invariant Violation: TurboModuleRegistry.getEnforcing(...):
 *   'RNGoogleSignin' could not be found.
 *
 * before the first render — verified on an emulator, the app would not start. Wrapping the
 * require in try/catch stopped the crash but not a full-screen LogBox overlay on every
 * launch, because the invariant reports through React Native's error handler on its way out.
 * Only NOT attempting the require in Expo Go gives a clean start, which is what this asserts.
 *
 * Jest is not Expo Go, so `executionEnvironment` is overridden per case rather than trusted.
 */

describe('loadGoogleSignin', () => {
  const realEnv = Constants.executionEnvironment;

  beforeEach(() => {
    resetGoogleSigninCacheForTests();
  });

  afterEach(() => {
    (Constants as { executionEnvironment: unknown }).executionEnvironment = realEnv;
  });

  it('does not touch the native package in Expo Go', () => {
    (Constants as { executionEnvironment: unknown }).executionEnvironment =
      ExecutionEnvironment.StoreClient;

    expect(loadGoogleSignin()).toBeNull();
  });

  it('caches the outcome instead of retrying the require on every render', () => {
    (Constants as { executionEnvironment: unknown }).executionEnvironment =
      ExecutionEnvironment.StoreClient;

    expect(loadGoogleSignin()).toBeNull();

    // Flipping the environment afterwards must NOT change the answer: the hook calls this on
    // each render, and a re-attempt per render is the retry loop the cache exists to avoid.
    (Constants as { executionEnvironment: unknown }).executionEnvironment =
      ExecutionEnvironment.Bare;

    expect(loadGoogleSignin()).toBeNull();
  });

  it('attempts the require outside Expo Go, and survives the package being absent', () => {
    (Constants as { executionEnvironment: unknown }).executionEnvironment =
      ExecutionEnvironment.Bare;

    // Under Jest the native side is not registered, so this exercises the catch rather than a
    // successful load. Either way it must return, not throw — a throw here is the crash.
    expect(() => loadGoogleSignin()).not.toThrow();
  });
});

/**
 * The iOS gate is one line, and deleting it looks harmless — the feature works on iOS, which
 * is exactly the trap. App Store guideline 4.8 requires Sign in with Apple alongside any
 * third-party sign-in, and this app has no Apple provider: no backend endpoint, no client
 * code. A Google button on iOS is therefore a rejection at submission, the most expensive
 * place to discover it.
 *
 * This fails if the gate is removed, so removing it has to be a decision rather than a tidy-up.
 * Delete this test WITH the gate, once Apple sign-in exists.
 */
describe('App Store guideline 4.8 gate', () => {
  const realOS = Platform.OS;

  // `Platform.OS` is a plain property on React Native's Jest mock, not a getter, so
  // `jest.spyOn(Platform, 'OS', 'get')` throws "property is not declared as a getter".
  // Assigning and restoring is the form that works here.
  const setOS = (os: string) => {
    (Platform as { OS: string }).OS = os;
  };

  afterEach(() => setOS(realOS));

  it('blocks Google sign-in on iOS while there is no Apple provider', () => {
    setOS('ios');
    expect(isBlockedByAppleGuideline()).toBe(true);
  });

  it('leaves Android alone — the obligation is Apple’s, not Google’s', () => {
    setOS('android');
    expect(isBlockedByAppleGuideline()).toBe(false);
  });
});
