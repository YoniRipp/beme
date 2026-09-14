# Mobile (Expo)

The native iOS and Android client. React Native 0.81 on Expo SDK 54, React 19,
React Navigation 7, React Native Paper 5. Talks to the same backend as the web app.

This package came back into active development on 2026-09-12. Anything native belongs
here — the Capacitor shell in `frontend/` is legacy and nothing in CI builds it.

## Commands
- Dev server: `npm start` (then `i` for the iOS simulator, `a` for Android)
- iOS simulator directly: `npm run ios`
- Typecheck: `npx tsc --noEmit`
- Tests: `npm test` (Jest, `jest-expo` preset)
- Resolved Expo config: `npx expo config --type public` (add `--type prebuild` to run plugins)

`EXPO_PUBLIC_API_URL` points the app at the backend — see `README.md` for the emulator
and physical-device forms. It defaults to `http://localhost:3000`.

## Config
`app.config.js` is the **only** Expo config file. There is no `app.json`: a dynamic config
replaces the static one wholesale rather than merging with it, so for a while every key in
`app.json` — icon, splash, orientation, the whole `ios`/`android` sections — was being
silently dropped. Don't reintroduce a second file. `/ios` and `/android` are gitignored and
generated, so anything native, permissions included, only exists if it is declared here.

Builds go through EAS (`eas.json`): `development` is a dev client, `development-simulator`
adds an iOS simulator build, then `preview` and `production`. `appVersionSource` is
`remote` because EAS cannot write a version back into a dynamic config.

## Architecture
- `src/screens/` — one component per screen, registered in `src/navigation/`
- `src/navigation/` — `RootNavigator` (auth gate) wrapping `MainTabs` (the tab bar)
- `src/features/` — feature-scoped logic: `body/`, `energy/`, `goals/`
- `src/core/api/client.ts` — the single fetch wrapper; all API calls go through it
- `src/hooks/` — React Query hooks (`useWorkouts`, `useEnergy`, `useGoals`, `useSettings`)
  plus device hooks (`useSpeechRecognition`, `useDebounce`)
- `src/context/` — `AuthContext`, `SettingsContext`
- `src/theme/` — `ThemeContext`, `useAppTheme`, `useThemedStyles`
- `src/domain/`, `packages/shared` — logic shared with the web client

## Patterns
- **Auth is bearer-token only.** The token lives in `expo-secure-store` (Keychain on iOS,
  EncryptedSharedPreferences on Android) under `trackvibe_token`, and every request sends
  `Authorization: Bearer <token>`. AsyncStorage holds settings only — don't put the token
  there. There is no cookie path here, which is why CORS never applies: React Native's
  `fetch` is NSURLSession-backed, sends no `Origin`, and enforces no access-control. A
  CORS problem in the browser is not a problem here.
- **Never inline a hex colour.** Use `useThemedStyles` / `useAppTheme`. There are AST
  guards in `src/theme/__tests__` that fail the build on frozen hex values — they exist
  because seven files had drifted, and they are easy to re-break.
- Server state is React Query; keys live in `src/lib/queryKeys.ts`.
- Logic the web client also needs goes in `packages/shared`, not copied.
- **Speech is the platform recognizer, not a server round-trip.** `useSpeechRecognition`
  wraps `expo-speech-recognition` (`SFSpeechRecognizer` on iOS, `SpeechRecognizer` on
  Android); audio never reaches a TrackVibe backend. The iOS prompt strings live in
  `app.config.js` — iOS raises SIGABRT if `NSSpeechRecognitionUsageDescription` is missing,
  so never strip them.

## Don't
- Don't import `useSpeechRecognition` from a screen while the app is still expected to run
  in Expo Go. `expo-speech-recognition` resolves its native module at import time, so the
  first screen that imports it makes a dev client mandatory for everyone. Building that dev
  client is the intended path (`eas build --profile development`) — just say so when you do.
- Don't add other native modules without flagging it: the same import-time rule applies, and
  every new native module means everyone rebuilds their dev client.
- Don't change API response shapes to suit this client; the web app and the MCP server
  consume the same endpoints.
