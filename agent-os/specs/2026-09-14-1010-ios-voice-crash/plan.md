# Plan — iOS Voice Crash: Usage Descriptions and the Denial Path

Status: **not started**. Reviewed against the code on `claude/ios-sweep-ios-voice-crash`
(base `dbd5fb1`) on 2026-09-14. The finding holds; three claims in `shape.md` need
narrowing before anyone writes the fix. Task 3 is **blocked on PR #293**.

## Task 1 — Verify the shape doc against the code

Done as part of this review. Recorded here because two of the results change the plan.

- [x] `frontend/android/app/src/main/AndroidManifest.xml` — **claim correct**. 41 lines,
      exactly one permission under a `<!-- Permissions -->` comment:
      `<uses-permission android:name="android.permission.INTERNET" />`. No `RECORD_AUDIO`.
- [x] `frontend/ios/` — **claim correct**, with a refinement: it is absent from the working
      tree *and* `git ls-files frontend/ios` is empty, but it is **not gitignored**. The
      root `.gitignore` is the only one in the tree and never mentions `ios`, `android` or
      Capacitor. So committing it is a decision, not a config change to undo first.
- [x] `frontend/CAPACITOR_SETUP.md` step 2 — **claim correct, verbatim**. "Step 2: Configure
      Info.plist" instructs a hand-edit of `ios/App/App/Info.plist` adding
      `NSSpeechRecognitionUsageDescription` and `NSMicrophoneUsageDescription` with the same
      two strings the shape doc quotes as the fix.
- [x] Native-vs-web routing — **claim correct**, and it explains the timing of the crash:
      - `frontend/src/hooks/useNativeSpeech.ts` sets `isNative` from
        `Capacitor.isNativePlatform()`, then on mount calls `SpeechRecognition.available()`
        to set `isAvailable`. `available()` does not touch protected data, so mount is safe.
        `startListening()` calls `SpeechRecognition.requestPermissions()` — **that** is the
        TCC-guarded call, and it is only reached on a mic tap.
      - `frontend/src/hooks/useSpeechRecognition.ts` picks native > stream > web batch via
        `useNativeImpl = isNative && native.isAvailable`.
      - `frontend/src/components/voice/VoiceAgentPanel.tsx:163` renders "Using native speech
        recognition" off that same flag, which is why the sheet was honest right up to the
        moment the process died.
- [x] Provenance: the whole asymmetry arrives in one commit, `77adb45` *"feat: Add Capacitor
      native speech recognition for iOS/Android"* (2026-02-27). It committed the stock
      `frontend/android/` scaffold, wrote `CAPACITOR_SETUP.md` telling a human to hand-edit
      Info.plist, and never committed `frontend/ios/`. Nobody regressed this; it shipped
      this way.
- [ ] Not verifiable in-repo: the `grep -n "UsageDescription" ios/App/App/Info.plist`
      returning nothing. `ios/` does not exist here. The crash log is the conclusive
      evidence and it names the missing key explicitly, so this is a note, not a doubt.

## Task 2 — Correct three overstatements in `shape.md`

- [ ] **"Android has the mirror of this problem"** — the manifest gap is real, the failure
      mode is not a mirror. Android does not abort when an app requests a permission it
      never declared; the framework returns `PERMISSION_DENIED` immediately, without a
      dialog. Rewrite as: *Android does not crash, it silently cannot ever be granted the
      microphone.* Both paths die, which is worth spelling out:
      - native: `SpeechRecognition.requestPermissions()` resolves denied on the first tap
        and every tap after
      - web fallback: `useWebSpeech` / `useVoiceStream` call `getUserMedia`, and Capacitor's
        WebChromeClient can only grant `RESOURCE_AUDIO_CAPTURE` if the app holds
        `RECORD_AUDIO` — so the fallback is blocked by the same missing line
      Severity stays high (voice is dead on Android), the word "crash" does not.
- [ ] **AC #1, "Both usage-description keys survive a clean `cap add ios` / `cap sync ios`"** —
      not achievable as written. `cap add ios` refuses to run when `ios/` already exists, and
      when it does run it writes a fresh template Info.plist. Nothing can survive it.
      Restate as one of the two real options, whichever #293 picks:
      - `frontend/ios/` is committed, `cap add ios` is a one-time bootstrap, and
        `cap sync ios` (which never rewrites Info.plist) is the steady state; **or**
      - `frontend/ios/` stays generated and a checked-in, idempotent post-add script patches
        the plist, with `CAPACITOR_SETUP.md` reduced to running that script
- [ ] **AC #4, "Denying permission shows an in-app message rather than a dead button"** —
      already half-true today, see Task 5. Restate against the actual gaps.
- [ ] While in the file: `CAPACITOR_SETUP.md:8` and its Troubleshooting section both claim
      *"simulator does not support speech recognition"*, which the shape doc's own verified
      fix contradicts — prompts, "Listening… tap to stop" and a live waveform, all in the
      iPhone 17 Pro simulator. One of the two is stale. Settle it and fix the doc in the
      same pass as Task 4.

## Task 3 — Decide where the Info.plist keys live — **BLOCKED ON PR #293**

This task cannot be completed and should not be attempted here.

- [ ] PR #293 (`claude/ios-sweep-capacitor-version-skew`,
      `agent-os/specs/2026-09-14-1005-capacitor-version-skew/shape.md`) owns the decision.
      Its own AC already carries *"A decision recorded on whether `frontend/ios/` is
      committed"*, and its shape doc names this task as the reason the question matters.
- [ ] #293 also has to land the CLI-8 upgrade first. Today `frontend/package.json` declares
      `"@capacitor/cli": "^7.5.0"` against `"@capacitor/core"`, `"ios"` and `"android"` at
      `"^8.1.0"`. A v7 CLI scaffolds an iOS 14 project that Capacitor 8 cannot build, so any
      `ios/` committed before that upgrade is a project that has to be regenerated anyway.
- [ ] **Ordering:** #293 upgrades the CLI, regenerates, records the commit/ignore decision.
      Only then does Task 4a have a file to edit. Do not commit a hand-patched iOS 14
      project to unblock this — that is the exact "patch on generated output" #293 is
      trying to end.
- [ ] Tasks 4b, 5 and 6 below are **not** blocked and can ship first.

## Task 4 — The fix, once Task 3 unblocks it

### 4a — iOS (blocked)

- [ ] Add to `frontend/ios/App/App/Info.plist`, in whatever form #293 settles on:
      - `NSSpeechRecognitionUsageDescription` — "TrackVibe uses speech recognition to
        understand your voice commands for logging activities."
      - `NSMicrophoneUsageDescription` — "TrackVibe needs microphone access to capture your
        voice commands."
- [ ] Both keys are required, not one. The plugin's `requestPermissions()` asks for speech
      *and* record permission; the speech key alone moves the SIGABRT to the second prompt.
- [ ] Copy is user-facing App Store review material. Keep the strings above — they name the
      app and the reason, which is what the review guideline asks for.

### 4b — Android (not blocked, ship independently)

- [ ] `frontend/android/app/src/main/AndroidManifest.xml` — add under the existing
      `<!-- Permissions -->` comment, next to `INTERNET`:
      `<uses-permission android:name="android.permission.RECORD_AUDIO" />`
- [ ] The file is committed (53 tracked files under `frontend/android/`), so this edit is
      permanent today. It needs nothing from #293. Splitting it out is the fastest way to
      close half the acceptance criteria.
- [ ] Consider a `<queries>` entry for the speech-recognition intent only if a device test
      shows `SpeechRecognition.available()` returning false on Android 11+. Do not add it
      blind.

## Task 5 — What actually happens on denial (the question `shape.md` does not answer)

Traced through the code, not observed on a device. Flagged as findings, not as verified
behaviour.

- [x] **There is already an in-app message.** `useNativeSpeech.startListening` throws
      `new Error('Speech recognition permission denied')`;
      `VoiceAgentPanel.handleStartRecording` catches it and does both `setError(msg)` —
      rendered at line 213 as `<p className="text-sm text-destructive">` — and
      `toast.error('Microphone', { description: msg })`. So AC #4's "dead button" is not
      what a denied user gets. Four narrower bugs are:
- [ ] **The copy is a developer string.** "Speech recognition permission denied" tells the
      user nothing they can act on. Compare the web path, which already does this right:
      `frontend/src/hooks/useWebSpeech.ts:149` maps `NotAllowedError` to *"Microphone access
      denied. Please allow microphone permission in your browser."* The native path deserves
      the equivalent, pointing at iOS Settings > TrackVibe. That asymmetry is the real UX bug.
- [ ] **There is no way back.** Once iOS records a denial, `requestPermissions()` resolves
      `denied` without prompting, forever. The mic button stays enabled (`isAvailable` is
      still true) and re-throws the same string on every tap. Nothing offers Settings. An
      `openSettings`-style action, or at minimum instructional copy, closes this.
- [ ] **Only one of the two permissions is checked.** The guard in `useNativeSpeech.ts`
      reads `if (!permResult.speechRecognition || permResult.speechRecognition === 'denied')`.
      Grant speech, deny the microphone, and that guard passes — the code calls
      `SpeechRecognition.start()` and the user sees whatever opaque audio-engine error the
      plugin surfaces. Two prompts, one inspected.
- [ ] **The guard treats `'prompt'` as granted.** The plugin returns a Capacitor
      `PermissionState`: `'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'`. The
      correct test is `!== 'granted'`. This one is a small fix in
      `frontend/src/hooks/useNativeSpeech.ts` and is worth a co-located unit test at
      `frontend/src/hooks/useNativeSpeech.test.ts` with the plugin mocked.
- [ ] **No fallback attempt.** On denial `useNativeImpl` stays true, so
      `useSpeechRecognition` never tries the streaming or batch paths. On iOS that is
      arguably correct — a system-level mic denial blocks `getUserMedia` in WKWebView too —
      but it should be a decision in the code with a comment, not an accident of ordering.
- [ ] **Android answer to the entangled question:** no, Android does not have the same crash
      risk. Requesting an undeclared runtime permission is a silent denial there, not a
      SIGABRT. What Android has is the same *dead feature*, arrived at quietly, plus a
      blocked WebView fallback (Task 2). Worth confirming on a device before the fix is
      called done, since this path has never been run.

## Task 6 — Documentation

- [ ] `frontend/CAPACITOR_SETUP.md` — rewrite step 2 to match whatever #293 decides. If
      `ios/` is committed, step 2 becomes "nothing to do, the keys are in the project"; if a
      script owns it, step 2 becomes the script invocation. A step that says "hand-edit a
      file that is not in the repo" is how this bug survived seven months.
- [ ] Same file — the two "simulator does not support speech recognition" lines (Task 2).
- [ ] Same file — the Platform Detection table is accurate and should stay.
- [ ] `agent-os/standards/global/tech-stack.md` still describes mobile as Expo + TWA and
      never mentions the Capacitor shell that crashed. Out of scope for this PR; noted in
      `standards.md` for a later `/agent-os:discover-standards` pass.

## Verification

- [ ] iPhone 17 Pro simulator, fresh install: mic tap shows the Speech prompt, then the
      Microphone prompt, then "Listening… tap to stop" with a waveform. No SIGABRT.
- [ ] Same device, deny speech: an actionable message in the sheet, a route to Settings, no
      silently dead button.
- [ ] Same device, allow speech / deny microphone: a sensible message, not a plugin error.
- [ ] Android device or emulator, fresh install: the RECORD_AUDIO prompt appears at all.
      This path has never been exercised — treat first run as new, not as a regression check.
- [ ] `~/Library/Logs/DiagnosticReports/` has no new `App-*.ips` after the sweep.
- [ ] `cd frontend && npx tsc --noEmit` clean; `npx vitest run` clean, including any new
      `useNativeSpeech.test.ts`.
- [ ] **No CI gate exists for either native project.** `.github/workflows/ci.yml` runs
      `agent-context`, `backend`, `docker`, `frontend`, `mobile` (the dormant Expo app),
      `migrations` and `security-audit`. Nothing builds `frontend/android/` or
      `frontend/ios/`, so nothing caught the missing permission and nothing will catch it
      coming back. If a native build job is added, that belongs in #293's scope, not here.

## Deliberately not done

- **PR #293 is not resolved here.** Whether `frontend/ios/` is committed is that task's
  call. This plan states the dependency and stops.
- **No hand-patched `ios/` committed as a stopgap.** It would be an iOS 14 project the
  Capacitor 8 runtime cannot build, and #293 would delete it.
- **Impl selection in `useSpeechRecognition.ts` is left alone.** Three platforms route
  through it and only one is broken. Changing the priority order to "fall back on denial"
  risks the two that work.
- **No permission pre-prompt.** A priming screen before the OS dialog is a product decision
  with real conversion consequences, not a bug fix. Out of scope.
