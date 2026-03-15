# TrackVibe Mobile

Expo (React Native) app for TrackVibe. Uses the same backend API as the web app.

## Setup

1. Install dependencies: `npm install`
2. Set the API base URL:
   - Create `.env` with `EXPO_PUBLIC_API_URL=http://localhost:3000` (or your backend URL).
   - For Android emulator pointing at your machine: `http://10.0.2.2:3000`
   - For a physical device, use your machine's LAN IP (e.g. `http://192.168.1.x:3000`).
3. Start the backend (from repo root: `cd backend && npm run dev`).
4. Run the app: `npm start`, then press `w` for web, or scan the QR code with Expo Go for device.

## Scripts

- `npm start` – Start Expo dev server
- `npm run android` – Run on Android
- `npm run ios` – Run on iOS (macOS only)
- `npm run web` – Run in browser

## Auth

Login and signup use the same backend as the web app. Token is stored in AsyncStorage. After login, all API requests send `Authorization: Bearer <token>`.
