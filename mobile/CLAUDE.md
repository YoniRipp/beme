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

`EXPO_PUBLIC_API_URL` points the app at the backend — see `README.md` for the emulator
and physical-device forms. It defaults to `http://localhost:3000`.

## Architecture
- `src/screens/` — one component per screen, registered in `src/navigation/`
- `src/navigation/` — `RootNavigator` (auth gate) wrapping `MainTabs` (the tab bar)
- `src/features/` — feature-scoped logic: `body/`, `energy/`, `goals/`
- `src/core/api/client.ts` — the single fetch wrapper; all API calls go through it
- `src/hooks/` — React Query hooks (`useWorkouts`, `useEnergy`, `useGoals`, `useSettings`)
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

## Don't
- Don't add native modules that need a custom dev client without saying so — the app
  currently runs in Expo Go, and breaking that changes everyone's workflow.
- Don't change API response shapes to suit this client; the web app and the MCP server
  consume the same endpoints.
