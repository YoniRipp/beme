# Capacitor Mobile Skill

Guide for building and testing the BMe mobile app with Capacitor.

## When to Use

Use this skill when:
- Building iOS or Android apps
- Adding native functionality
- Testing on devices/simulators
- Debugging mobile-specific issues

## Project Structure

```
frontend/
├── src/                    # React app (shared web + mobile)
├── ios/                    # iOS native project
├── android/                # Android native project
├── capacitor.config.ts     # Capacitor configuration
└── package.json
```

## Setup Requirements

### iOS Development

- macOS with Xcode installed
- Xcode Command Line Tools: `xcode-select --install`
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer account (for device testing)

### Android Development

- Android Studio installed
- Android SDK with API level 33+
- Java Development Kit (JDK) 17+
- Set `ANDROID_HOME` environment variable

## Basic Commands

```bash
cd frontend

# Sync web assets to native projects
npx cap sync

# Open in native IDE
npx cap open ios
npx cap open android

# Run on device/simulator
npx cap run ios
npx cap run android

# Build web assets first
npm run build && npx cap sync
```

## Capacitor Configuration

```typescript
// frontend/capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beme.app',
  appName: 'BMe',
  webDir: 'dist',
  server: {
    // For development, use live reload
    url: 'http://192.168.1.100:5173', // Your local IP
    cleartext: true,
  },
  plugins: {
    // Plugin configurations
  },
};

export default config;
```

## Adding Native Platforms

```bash
cd frontend

# Add iOS
npx cap add ios

# Add Android
npx cap add android
```

## Common Plugins

### Install Plugins

```bash
npm install @capacitor/camera
npm install @capacitor/microphone
npm install @capacitor/haptics
npm install @capacitor/keyboard
npm install @capacitor/status-bar
npm install @capacitor/splash-screen

# Sync after installing
npx cap sync
```

### Using Plugins

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';

// Camera
async function takePicture() {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Uri,
  });
  return image.webPath;
}

// Haptics
async function vibrate() {
  await Haptics.impact({ style: ImpactStyle.Medium });
}

// Keyboard
Keyboard.addListener('keyboardWillShow', (info) => {
  console.log('Keyboard height:', info.keyboardHeight);
});
```

## Voice Recording (for BMe)

```typescript
import { Capacitor } from '@capacitor/core';

// Check if running on native
export const isNative = Capacitor.isNativePlatform();

// Use native recording on mobile
async function startRecording() {
  if (isNative) {
    // Use native microphone plugin
    const { Microphone } = await import('@capacitor/microphone');
    await Microphone.requestPermissions();
    // ... native recording
  } else {
    // Use Web Audio API
    // ... web recording
  }
}
```

## Development Workflow

### 1. Live Reload Setup

```typescript
// capacitor.config.ts (development only)
server: {
  url: 'http://YOUR_LOCAL_IP:5173',
  cleartext: true,
}
```

Find your IP:
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig | grep inet
```

### 2. Run Development Build

```bash
# Terminal 1: Start frontend dev server
cd frontend && npm run dev -- --host

# Terminal 2: Run on simulator
npx cap run ios
```

### 3. Build for Production

```bash
cd frontend
npm run build
npx cap sync
npx cap open ios  # Then build in Xcode
```

## iOS Specific

### Permissions (Info.plist)

```xml
<!-- ios/App/App/Info.plist -->
<key>NSMicrophoneUsageDescription</key>
<string>BMe needs microphone access for voice commands</string>

<key>NSCameraUsageDescription</key>
<string>BMe needs camera access to scan receipts</string>
```

### Build and Run

```bash
# Run on simulator
npx cap run ios --target "iPhone 15 Pro"

# List available simulators
xcrun simctl list devices

# Build for App Store
# Open in Xcode and use Product → Archive
```

## Android Specific

### Permissions (AndroidManifest.xml)

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
```

### Build and Run

```bash
# Run on emulator
npx cap run android

# Build APK
cd android && ./gradlew assembleDebug

# Build for Play Store
cd android && ./gradlew bundleRelease
```

## Platform Detection

```typescript
import { Capacitor } from '@capacitor/core';

export const platform = {
  isNative: Capacitor.isNativePlatform(),
  isIOS: Capacitor.getPlatform() === 'ios',
  isAndroid: Capacitor.getPlatform() === 'android',
  isWeb: Capacitor.getPlatform() === 'web',
};

// Conditional features
if (platform.isNative) {
  // Use native features
} else {
  // Fall back to web
}
```

## Debugging

### iOS

1. Open Safari → Develop → Simulator
2. Select your app
3. Use Safari DevTools

### Android

1. Open Chrome → `chrome://inspect`
2. Select your device/emulator
3. Use Chrome DevTools

### Native Logs

```bash
# iOS (in Xcode)
# View console output in Debug area

# Android
adb logcat | grep -E "(BMe|Capacitor)"
```

## Common Issues

### "Unable to sync" error
```bash
# Clean and rebuild
cd frontend
rm -rf node_modules ios android
npm install
npx cap add ios
npx cap add android
npx cap sync
```

### Microphone not working
- Check permissions in native project
- Request permissions at runtime
- Test on real device (simulator has limitations)

### API calls failing
- Check API URL in capacitor.config.ts
- Ensure `cleartext: true` for HTTP (dev only)
- Use HTTPS in production

### Build failing on iOS
```bash
cd frontend/ios/App
pod install --repo-update
```

## BMe Mobile-Specific Features

### Voice Agent Integration

```typescript
// Use native speech recognition when available
import { SpeechRecognition } from '@capacitor/speech-recognition';

async function startVoiceAgent() {
  if (platform.isNative) {
    await SpeechRecognition.requestPermissions();
    const result = await SpeechRecognition.start({
      language: 'en-US',
      partialResults: true,
    });
    // Process result.value
  } else {
    // Use Web Speech API
  }
}
```

### Offline Support

```typescript
import { Network } from '@capacitor/network';

Network.addListener('networkStatusChange', (status) => {
  if (!status.connected) {
    // Show offline indicator
    // Queue actions for later sync
  }
});
```
