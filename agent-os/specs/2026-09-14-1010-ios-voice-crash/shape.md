# iOS app hard-crashes the first time you tap the microphone

Status: **not started** — filed from the iOS simulator click sweep of 2026-09-14.
Severity: **critical**. Voice is the primary input method for this product, and on iOS
it terminates the app.

## The mismatch

On iPhone 17 Pro (iOS 26.5 simulator): sign in, tap the centre mic in the bottom bar, tap
the big mic in the Voice Agent sheet — the app disappears to the home screen. Not an
error toast, not a permission denial. `SIGABRT`.

From `~/Library/Logs/DiagnosticReports/App-2026-09-14-094619.ips`:

```
"exception" : {"codes":"0x0…0, 0x0…0","rawCodes":[0,0],"type":"EXC_CRASH","signal":"SIGABRT"},

This app has crashed because it attempted to access privacy-sensitive data without a
usage description. The app's Info.plist must contain an NSSpeechRecognitionUsageDescription
key with a string value explaining to the user how the app uses this data.
```

The Voice Agent sheet itself correctly reports "Using native speech recognition", i.e. it
routes to `@capacitor-community/speech-recognition` as designed — and that is exactly the
call that kills the process.

## Why it happens

The generated `ios/App/App/Info.plist` has **no** usage-description keys at all:

```
$ grep -n "UsageDescription" ios/App/App/Info.plist
NONE FOUND
```

`frontend/CAPACITOR_SETUP.md` step 2 does document adding
`NSSpeechRecognitionUsageDescription` and `NSMicrophoneUsageDescription` by hand — but
`frontend/ios/` is not committed to the repository, so there is nowhere for that edit to
live. Every fresh `cap add ios` produces a crashing build again.

**Android has the mirror of this problem.** `android/app/src/main/AndroidManifest.xml`
declares only `android.permission.INTERNET` — there is no `RECORD_AUDIO`, despite the
same speech-recognition plugin being wired up.

## Verified fix

Adding the two keys turns the crash into the correct iOS permission flow — confirmed by
rebuilding and re-running: the Speech Recognition prompt appears, then the Microphone
prompt, then the sheet goes to "Listening… tap to stop" with a live waveform.

```
NSSpeechRecognitionUsageDescription
  TrackVibe uses speech recognition to understand your voice commands for logging activities.
NSMicrophoneUsageDescription
  TrackVibe needs microphone access to capture your voice commands.
```

This needs a permanent home — see the companion task on whether `frontend/ios/` is
committed. A hand-edit to an uncommitted generated folder is not a fix.

## Acceptance criteria

- [ ] Both usage-description keys survive a clean `cap add ios` / `cap sync ios`
- [ ] `RECORD_AUDIO` is declared in the Android manifest
- [ ] Tapping the mic on a fresh install shows the OS permission prompt, never a crash
- [ ] Denying permission shows an in-app message rather than a dead button
