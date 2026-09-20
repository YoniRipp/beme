/**
 * The single source of truth for the Expo config.
 *
 * There used to be an `app.json` next to this file. Expo resolves a dynamic config
 * (`app.config.js`) *after* the static one and lets it replace the result wholesale, so the
 * old static-object export here shadowed `app.json` entirely -- icon, splash, orientation,
 * userInterfaceStyle, newArchEnabled and every `ios`/`android`/`web` key were silently
 * dropped from the resolved config. This app cannot be static-only (`extra.apiUrl` reads an
 * env var), so the two files are collapsed into this one rather than kept in a merge
 * relationship that already failed once.
 *
 * The `({ config })` signature and the `...config` spread are kept deliberately: if `eas init`
 * or a future tool writes an `app.json` back, its keys flow through instead of vanishing.
 *
 * Native projects are generated (`/ios` and `/android` are gitignored), so everything native
 * -- permissions included -- has to be declared here or it does not exist.
 */

/**
 * Shown in the iOS permission prompts. Wording carried over from the retired Capacitor setup
 * guide (`frontend/CAPACITOR_SETUP.md`) so the ask reads the same as it always has.
 *
 * `NSSpeechRecognitionUsageDescription` is not optional: iOS raises SIGABRT the first time an
 * app touches SFSpeechRecognizer without it. It is declared in `ios.infoPlist` *and* passed to
 * the speech plugin below -- the plugin only fills in a generic default when the key is
 * absent, and this is not a string worth leaving to a fallback.
 */
const SPEECH_RECOGNITION_PERMISSION =
  'TrackVibe uses speech recognition to understand your voice commands for logging activities.';
const MICROPHONE_PERMISSION = 'TrackVibe needs microphone access to capture your voice commands.';

/**
 * Reused from the retired Capacitor shell, which never shipped: its `versionCode` is still 1,
 * it has no signing config, `assetlinks.json` still holds the placeholder fingerprint, and the
 * id was renamed `com.bme.app` -> `com.trackvibe.app` in 858de40 (store package names are
 * immutable, so a published app could not have been renamed). Nothing owns this id yet.
 * Confirm it is free on App Store Connect and the Play Console before the first submission.
 */
const BUNDLE_ID = 'com.trackvibe.app';

/**
 * Apple's privacy manifest, required on every upload since 2024-05-01: an approved reason for
 * each "required reason" API the binary touches, app code and third-party SDKs alike.
 *
 * Expo does not fully automate this. SDK packages ship their own `PrivacyInfo.xcprivacy`, but
 * Apple does not reliably pick those up from static CocoaPods dependencies, so the app config
 * has to restate them. Missing declarations come back as an email minutes after upload -- fast
 * feedback, but each round trip costs a build.
 *
 * Mirrored from the manifests actually installed in this app's dependency tree, not guessed:
 *
 * | package | category | reasons |
 * |---|---|---|
 * | `@react-native-async-storage/async-storage` | FileTimestamp | C617.1 |
 * | `expo-file-system` (via `expo`) | FileTimestamp, DiskSpace | 0A2A.1, 3B52.1 / E174.1, 85F4.1 |
 * | `expo-constants` | UserDefaults | CA92.1 |
 * | `react-native` core | FileTimestamp, UserDefaults | C617.1, CA92.1 |
 *
 * Worth knowing when the spec and the packages disagree: the readiness spec assumed
 * async-storage needed `UserDefaults`/`CA92.1`. Its manifest asks for `FileTimestamp`/`C617.1`
 * instead -- `UserDefaults` comes from `expo-constants` and React Native core. Re-read the
 * installed manifests after any dependency bump rather than trusting this table:
 * `find node_modules -name PrivacyInfo.xcprivacy`.
 *
 * `NSPrivacyTracking: false` because nothing here tracks across apps or sites; there is no ad
 * SDK and no IDFA access, so `NSPrivacyTrackingDomains` stays empty. `NSPrivacyCollectedDataTypes`
 * is deliberately left out: what the app collects is declared in App Store Connect's privacy
 * questionnaire, which is a person's job and is where Apple reads it from.
 */
const PRIVACY_MANIFESTS = {
  NSPrivacyTracking: false,
  NSPrivacyTrackingDomains: [],
  NSPrivacyCollectedDataTypes: [],
  NSPrivacyAccessedAPITypes: [
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
      NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
      NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
      NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
    },
  ],
};

export default ({ config }) => ({
  ...config,
  name: 'TrackVibe',
  slug: 'trackvibe',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#110f0e',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID,
    infoPlist: {
      NSSpeechRecognitionUsageDescription: SPEECH_RECOGNITION_PERMISSION,
      NSMicrophoneUsageDescription: MICROPHONE_PERMISSION,
      // Export-compliance declaration. Without it App Store Connect asks the encryption
      // question on every single submission and holds the build until it is answered.
      // `false` is the accurate answer here: the app ships no cryptography of its own --
      // grep finds no crypto/cipher use in `mobile/src` -- and only relies on the OS's
      // standard HTTPS and the Keychain via expo-secure-store, both of which are exempt.
      // Revisit this if custom encryption is ever added.
      ITSAppUsesNonExemptEncryption: false,
    },
    privacyManifests: PRIVACY_MANIFESTS,
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    // Additive, not an allowlist: the speech plugin unions its own RECORD_AUDIO into this.
    permissions: ['android.permission.RECORD_AUDIO'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    /**
     * SDK 57 requires these three to be declared explicitly -- they are no longer implied
     * by their presence in `dependencies`. `expo install --fix` prints them but cannot write
     * them itself, because this config is dynamic (see the file header). Omitting them means
     * the generated native project loses their config, so fonts, the secure store and the
     * status bar silently ship unconfigured.
     */
    'expo-font',
    'expo-secure-store',
    'expo-status-bar',
    [
      'expo-speech-recognition',
      {
        speechRecognitionPermission: SPEECH_RECOGNITION_PERMISSION,
        microphonePermission: MICROPHONE_PERMISSION,
      },
    ],
  ],
  extra: {
    // Spread first so an `extra.eas.projectId` written by `eas init` survives.
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
    // Where the in-app privacy and terms links point -- the live web origin, confirmed by
    // the owner rather than inferred. It previously defaulted to `https://trackvibe.app`,
    // guessed from the address the privacy policy gives, and that domain is not ours: both
    // links 404'd, which App Store Guideline 5.1.1(i) treats as a rejection. Override with
    // `EXPO_PUBLIC_WEB_URL` if the app moves to its own domain. See `src/lib/appUrls.ts`.
    webUrl: process.env.EXPO_PUBLIC_WEB_URL ?? 'https://beme.up.railway.app',
  },
});
