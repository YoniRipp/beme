# TrackVibe Mobile

Expo (React Native) app for TrackVibe. Uses the same backend API as the web app.

## Setup

1. Install dependencies: `npm install`
2. Set the API base URL:
   - Create `.env` with `EXPO_PUBLIC_API_URL=http://localhost:3000` (or your backend URL).
   - For Android emulator pointing at your machine: `http://10.0.2.2:3000`
   - For a physical device, use your machine's LAN IP (e.g. `http://192.168.1.x:3000`).
3. Start the backend (from repo root: `cd backend && npm run dev`).
4. Run the app: `npm start`, then press `w` for web, `i` for the iOS simulator, or scan the
   QR code with a development build on a device.

## Scripts

- `npm start` – Start Expo dev server
- `npm run android` – Run on Android
- `npm run ios` – Run on iOS (macOS only)
- `npm run web` – Run in browser

## Development builds

Voice input uses `expo-speech-recognition`, a native module. Expo Go does not contain it, so
once a screen imports `src/hooks/useSpeechRecognition.ts` the app needs a **development
build** instead of Expo Go. Everything else about the workflow is unchanged — `npm start`
still serves the JS, you just open it in the development build rather than in Expo Go.

One-time setup, run by someone with the Expo account:

```bash
npm install -g eas-cli
eas login
cd mobile && eas init          # creates the EAS project and prints extra.eas.projectId
```

`eas init` cannot write into a dynamic config, so paste the id it prints into
`app.config.js` under `extra`:

```js
extra: {
  ...config.extra,
  eas: { projectId: '<the id eas init printed>' },
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
},
```

Then build (profiles are in `eas.json`):

```bash
eas build --profile development-simulator --platform ios   # no Apple account needed
eas build --profile development --platform ios             # physical device
eas build --profile development --platform android         # APK, sideloadable
```

Install the artifact once; reinstall only when a native module is added or changed.

## Config

`app.config.js` is the only Expo config file — there is deliberately no `app.json`. A
dynamic config replaces the static one rather than merging with it, so a second file gets
silently discarded. Check what Expo actually resolved with:

```bash
npx expo config --type public     # the manifest
npx expo config --type prebuild   # after config plugins run
```

## Auth

Login and signup use the same backend as the web app. The token is stored in `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android), not AsyncStorage. After login, all API requests send `Authorization: Bearer <token>`.
