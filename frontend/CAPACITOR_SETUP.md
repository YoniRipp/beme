# Capacitor iOS Setup Guide

> **Superseded — kept for reference only.** Native iOS and Android now ship from
> `mobile/` (Expo, SDK 54), not from this Capacitor shell. Nothing in CI builds the
> Capacitor projects.
>
> These instructions also no longer work as written: `@capacitor/cli` is pinned a major
> behind `@capacitor/core|ios|android`, so the CLI scaffolds an iOS 14 project that
> Capacitor 8 refuses to build (`pod install` fails on the deployment target, then
> `xcodebuild` fails on the same). Step 4.3 below — "iOS 14.0 or higher recommended" —
> is the setting that breaks it. The claim under Prerequisites that the simulator cannot
> do speech recognition is also wrong; it can.
>
> Don't follow this to stand up a new iOS build. Use `mobile/`.

This document describes how to complete the iOS native app setup on macOS.

## Prerequisites

- macOS with Xcode 15+ installed
- Apple Developer account (free for testing, paid for App Store)
- iOS device for testing (simulator does not support speech recognition)

## Step 1: Add iOS Platform (macOS only)

Run this command on a Mac:

```bash
cd frontend
npm run cap:add:ios
```

This creates the `ios/` folder with the Xcode project.

## Step 2: Configure Info.plist

After adding the iOS platform, add these entries to `ios/App/App/Info.plist`:

```xml
<key>NSSpeechRecognitionUsageDescription</key>
<string>TrackVibe uses speech recognition to understand your voice commands for logging activities.</string>
<key>NSMicrophoneUsageDescription</key>
<string>TrackVibe needs microphone access to capture your voice commands.</string>
```

## Step 3: Open in Xcode

```bash
npm run cap:ios
```

This builds the web app and opens Xcode.

## Step 4: Configure Xcode

1. **Select your Team**: In Xcode, go to the project settings (click on "App" in the navigator), select the "Signing & Capabilities" tab, and choose your Apple Developer Team.

2. **Set Bundle ID**: Change to your unique bundle ID if needed (default: `com.trackvibe.app`).

3. **Set Deployment Target**: iOS 14.0 or higher recommended.

4. **Test on Device**:
   - Connect your iPhone via USB
   - Select your device in the device dropdown
   - Click Run (Cmd+R)

## Development Workflow

### Build and sync changes:
```bash
npm run build
npm run cap:sync
```

### Live reload development:
```bash
npm run cap:ios:dev
```

### Open Xcode:
```bash
npx cap open ios
```

## Platform Detection

The app automatically detects the platform:

| Platform | Speech Recognition Method |
|----------|--------------------------|
| iOS native app | Apple Speech framework (real-time, ~200ms) |
| Android native app | Android Speech API (real-time) |
| Web browsers | MediaRecorder + Gemini backend (~2-3s) |
| iOS Safari PWA | MediaRecorder + Gemini backend (~2-3s) |

## Troubleshooting

### Speech recognition not working on iOS
- Ensure you're running on a real device (simulator doesn't support Speech)
- Check that both Info.plist permissions are added
- Verify the device has internet connection (Apple Speech requires it for some languages)

### Build errors
- Run `npx cap sync` after any changes to the web app
- Clean build in Xcode: Product > Clean Build Folder (Shift+Cmd+K)
