# TrackVibe — Trusted Web Activity (TWA) for Google Play

This directory documents how to package the TrackVibe PWA as an Android app using a Trusted Web Activity (TWA) and publish it to the Google Play Store.

## Prerequisites

- Node.js 18+
- Java JDK 11+ (for signing)
- A deployed TrackVibe PWA (e.g. `https://trackvibe.app`) with valid HTTPS and manifest
- Google Play Developer account ($25 one-time fee)

## Steps

### 1. Install Bubblewrap

```bash
npm install -g @nicedoc/bubblewrap
```

### 2. Initialize the TWA project

```bash
cd twa
bubblewrap init --manifest https://your-deployed-url.com/manifest.webmanifest
```

This generates an Android project. Follow the prompts to configure:
- **Package name**: `com.trackvibe.app`
- **App name**: `TrackVibe`
- **Signing key**: Create a new keystore or use an existing one

### 3. Build the APK/AAB

```bash
bubblewrap build
```

This produces:
- `app-release-signed.apk` (for testing)
- `app-release-bundle.aab` (for Play Store upload)

### 4. Set up Digital Asset Links

The `assetlinks.json` file at `frontend/public/.well-known/assetlinks.json` must contain your signing key's SHA-256 fingerprint.

Get your fingerprint:

```bash
keytool -list -v -keystore your-keystore.jks -alias your-alias | grep SHA256
```

Replace `REPLACE_WITH_YOUR_SIGNING_KEY_SHA256_FINGERPRINT` in `assetlinks.json` with the actual value.

### 5. Verify Digital Asset Links

After deploying the updated `assetlinks.json`, verify at:
```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://your-deployed-url.com&relation=delegate_permission/common.handle_all_urls
```

### 6. Upload to Google Play Console

1. Go to https://play.google.com/console
2. Create a new app
3. Upload the `.aab` file under Release > Production
4. Fill in the store listing, content rating, and pricing
5. Submit for review

## Testing locally

Install the APK on a device or emulator:

```bash
adb install app-release-signed.apk
```

## Notes

- The TWA wraps the deployed PWA URL — it doesn't bundle the frontend code
- The app bar will be hidden (full-screen) only if Digital Asset Links verification passes
- Updates to the PWA are instantly reflected — no app store update needed
- For iOS App Store, consider using PWABuilder (https://pwabuilder.com) which can generate an iOS wrapper
