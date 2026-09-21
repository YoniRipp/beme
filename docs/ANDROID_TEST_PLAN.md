# Android test plan

A full manual pass over the Expo client on Android, covering the four mobile PRs in flight
(#373, #374, #375, #376) plus the app that was already there.

There is a tickable version of this at
<https://claude.ai/artifact/FiGhjkBjVeE3QhemkpwAka> — same checks, openable on the phone
you are testing with, and it records pass/fail so the failures can be read back. This file is
the canonical copy and the one an iOS sibling should be written against.

Check ids (`G1`, `D3`, `M6`…) are stable. Quote them when reporting a failure.

---

## Why there is a `test/android-rc` branch

The four features are on four separate branches and **no single PR branch contains all four**,
so there is no build that exercises the app as a whole. `test/android-rc` is `main` with all
four merged:

| PR | Branch | What it adds |
|---|---|---|
| [#373](https://github.com/YoniRipp/beme/pull/373) | `feat/mobile-drawer-nav` | The left navigation drawer |
| [#374](https://github.com/YoniRipp/beme/pull/374) | `feat/mobile-macro-targets` | Settable daily macro targets |
| [#375](https://github.com/YoniRipp/beme/pull/375) | `feat/mobile-google-signin-v2` | Google sign-in, gated off iOS |
| [#376](https://github.com/YoniRipp/beme/pull/376) | `feat/mobile-password-reset` | Password reset request |

They stack cleanly apart from one collision: #373 and #376 both add imports to
`mobile/src/navigation/RootNavigator.tsx`. It is resolved on the RC branch — `AppDrawer`
supersedes the direct `MainTabs` import, because `AppDrawer` renders `MainTabs` itself.

Verified on the RC branch at the time of writing: `tsc --noEmit` clean, **425 tests across 50
suites** passing, and `expo export --platform android` producing a 5.2 MB bundle.

The branch is a test vehicle, not a merge candidate. Merge the PRs individually; rebuild the
RC branch from `main` if they land in a different order.

---

## What the first run found

Claude ran the whole plan on a signed preview APK against the live API on 2026-09-21, on an
emulator. **51 of 56 checks pass.** Results per check are in the artifact linked above.

**Four genuine defects.** Two are fixed, one is known and tracked, one is open:

| | | |
|---|---|---|
| **P2** | Tab labels struck through by the home indicator — no bottom safe-area inset | **fixed**, `5e98fd3`, confirmed on device |
| **M5 / M7** | A macro target can never be cleared, on any client | **fixed** in two layers, [#380](https://github.com/YoniRipp/beme/pull/380) + [#374](https://github.com/YoniRipp/beme/pull/374); needs #380 deployed |
| **P5** | Saving offline gives no feedback at all — silent failure | **open** |
| **T4** | Imperial relabels `kg`→`lbs` without converting, and only on the workout card | known; groundwork for the migration already in place |

**P5 is the one still worth fixing.** With airplane mode on, tapping Save produced nothing for
55 seconds — no error, no spinner, no toast. It doesn't crash, hang or falsely succeed, but a
user gets no signal and would navigate away having lost the entry. Proven to be the offline
path and not a dead button: the same tap saved instantly once the network returned.

**M5/M7 was the most interesting.** The clear-a-target path was broken *twice over*, and either
half alone would have hidden the other: the mobile client converted the deliberate `null` to
`undefined` (which `JSON.stringify` drops), and the backend then filtered explicit nulls out
anyway. The backend half means **no client, web included, can clear any nullable profile
field** — sex, height, weights, activity level, cycle length. That behaviour was pinned by a
test on purpose, so changing it was a decision, not just a fix.

**D3 cleared.** The `@expo/vector-icons` regression is genuinely gone on a signed build.

**Three checks were mis-specified by Claude, not failing** — A10, D1 and L4, each corrected in
place below. That is worth knowing as a pattern: on a first run through a new plan, a
surprising result is about as likely to be a wrong expectation as a real defect. Read the code
before filing it.

**Two method notes worth carrying to iOS.** An HTTP 200 from `beme.up.railway.app` proves
nothing — it is an SPA that answers 200 on every path, so T5 had to be checked by rendering the
pages, not curling them. And a local build is impossible from the author's machine: `expo
prebuild` leaves `mobile/android/` empty and dies with `MainApplication does not exist`,
because the repo path contains Hebrew characters inside OneDrive. EAS builds on Linux and is
unaffected.

**Smaller observations, none failing:** Workout Frequency ellipsises all twelve x-axis labels
to `Jul…Jul…Jul…` so they convey nothing, and uses fractional ticks (0.2, 0.4, 0.7) for what is
a count of workouts. The Google button's hint names an environment variable to the user. And
`Home`'s water card is stuck at the hardcoded 8-glass default because mobile has no profile UI.

---

## Gates — do these in order

Nothing downstream means anything until all four pass.

### G1 · Point the build at the live API

```bash
eas env:set --environment preview --name EXPO_PUBLIC_API_URL --value https://bme-production.up.railway.app --visibility plaintext --non-interactive
```

**Expect:** `eas env:list --environment preview` lists it. It currently lists nothing, for any
environment.

**Do not skip this.** `mobile/app.config.js` falls back to `http://localhost:3000` when
`EXPO_PUBLIC_API_URL` is unset, and EAS resolves the config *on the build server* — a variable
exported in your own shell never reaches it. Build without this and every screen renders,
every request fails, and it reads as a broken app rather than a broken build.

Note the host: `bme-production.up.railway.app` is the API. `beme.up.railway.app` is the web
SPA and answers 200 with HTML on every path, including paths that do not exist — which is why
pointing the app at it fails as a JSON parse error rather than a 404.

### G2 · Build from the combined branch

```bash
git checkout test/android-rc
cd mobile
eas build -p android --profile preview
```

**Expect:** a build link, then an installable APK. The `preview` profile produces a standalone
APK — no Metro, no laptop, which is what you want for a test that reflects what a user gets.

### G3 · Install and cold-start

**Expect:** splash on the dark ground, then the sign-in screen. No red error screen, no blank
white.

A crash here is native or module resolution, which typecheck and Jest cannot see. Capture the
first line of the error, not the stack.

### G4 · Prove the phone reached the API

Sign in with a deliberately wrong password.

**Expect:** *"Invalid email or password."*

A network error or a JSON parse error instead means G1 did not take. Cheapest possible proof
that the rest of the run is worth doing.

---

## A · Getting in and out

Create a throwaway account at A1 and use it for the whole run. X1 deletes it.

- **A1** — Sign up a new throwaway account. → Lands on Home, signed in.
- **A2** — Force-quit from the recents switcher, reopen. → Still signed in. *(The token is in
  `expo-secure-store`, i.e. the Android keystore. A failure here means every launch is a login.)*
- **A3** — Settings → Sign out. → Back to sign-in.
- **A4** — Sign back in. → Home, data intact.
- **A5** — Look for "Forgot your password?" on the sign-in screen. → Present, below the
  create-an-account line. `#376`
- **A6** — Tap it. → "Reset password" screen. `#376`
- **A7** — Send with the field empty. → *"Enter the email address for your account"*, no
  request sent. `#376`
- **A8** — Type any address and send. → *"If an account exists for … a reset link is on its
  way."* `#376`

  The same message appears whatever you type, **on purpose**. A screen that said "no account
  found" would let anyone check which addresses are registered. Identical wording for a real
  and a fake address is the check passing, not the check being vague.
- **A9** — "Back to sign in". → Returns. `#376`
- **A10** — Look at the Google button. → Present but **disabled**, with the hint *"Set
  EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB to enable Google sign-in."* `#375`

  *Corrected after the first run — this check originally said the button should be absent,
  which was wrong.* `GoogleSignInButton` returns `null` only for Expo Go and for the iOS
  guideline gate. Missing **only** the client ID is a state someone running the build can
  act on, so it renders disabled and explains itself, mirroring the web's
  `SocialLoginButtons.tsx`. Absent would be the bug.

  Worth raising separately: that hint is developer-facing copy in a shipped build. It shows
  whenever the variable is unset, production included — a user would read an environment
  variable name on the sign-in screen.

## B · Left navigation drawer `#373`

- **D1** — Tap the hamburger on Home. → Drawer slides over the content.

  *Corrected after the first run.* This originally said to swipe in from the left edge. That
  is not achievable on gesture navigation: swipes from x=3 and x=60 both fired Android's
  system **back** gesture and exited the app. The system owns the left edge (the default
  since Android 10), and React Navigation's 32dp `swipeEdgeWidth` loses to it. Universal to
  Android drawers, not a defect here — Google's guidance is to provide the hamburger, which
  this does. Try the swipe if you like, but the hamburger is the check.
- **D2** — Read the rows. → Exactly six, in order: Home, Body, Energy, Goals, Insights,
  Settings.
- **D3** — Look at every row's icon. → House, dumbbell, lightning bolt, target, chart line,
  cog. Real icons, not empty boxes.

  **Regression trap.** Expo SDK 57 stopped shipping `@expo/vector-icons` as a transitive
  dependency and every icon in the app silently became a tofu box. Typecheck, the full test
  suite and the bundle were all green while it was broken. A guard test covers it now, but
  this is the only check here that has already shipped broken once — give it a real look.
- **D4** — Note the highlighted row. → Only the screen you are on. *(Was a real bug: the
  drawer read the wrong level of navigation state and highlighted all six.)*
- **D5** — Tap a different row. → Navigates **and** the drawer closes. *(Was a real bug: it
  navigated and left the drawer open over the new screen.)*
- **D6** — Check the tab bar after tapping. → Selected tab matches the row you tapped.
- **D7** — Open the drawer, press Android back. → Closes the drawer, stays on the screen.

## C · Daily macro targets `#374`

- **M1** — Home → Fuel card. → Carbs, protein and fat bars.
- **M2** — Tap the macro bars. → "Edit daily macro targets" dialog. *(The bars are a control
  now; before this they looked identical and did nothing.)*
- **M3** — Look at the fields. → Pre-filled with current targets, not blank.
- **M4** — Set carbs 250, protein 150, fat 70; save. → Bars redraw against the new numbers.
- **M5** — Clear one field; save. → That target unset, its bar shows no target — not zero, not
  the old value.
- **M6** — Enter 9999 for carbs. → Clamped to 1500. Protein and fat clamp at 500. *(These
  mirror the server's caps in `upsertProfileSchema`. If an over-cap number saves, client and
  server disagree and the save fails server-side instead.)*
- **M7** — Enter 0, then a negative. → Both treated as "no target", not saved as 0.
- **M8** — Force-quit and reopen. → Targets still set.

## D · Logging

- **L1** — Log a food entry. → Saves; appears on Home and Energy.
- **L2** — Log a workout. → Saves; appears on Body; increments "Workouts this week".
- **L3** — Log sleep. → Saves; appears on Energy.
- **L4** — Log a weight entry. → Saves; appears on **Home** — both as a quick-log tile and a
  Weight card. *Corrected after the first run: this said Body, which is wrong. Body is
  workouts only; `WeightCard.tsx` is imported by `HomeScreen`, not `BodyScreen`.*
- **L5** — Create a goal. → Saves; appears on Goals; progress reflects logged data.
- **L6** — Open a form and dismiss without saving. → Nothing written.
- **L7** — Reopen a saved entry and edit it. → Fields seeded with saved values; the edit sticks.

## E · Every screen renders

- **S1** — Home. → Renders; "Loading recent activity" resolves rather than spinning forever.
- **S2** — Body → tap the workout type filter. → List and weekly chart both respond.
- **S3** — Energy. → Renders with food and sleep entries.
- **S4** — Goals. → Goals with progress. "Set your first goal" only when empty.
- **S5** — Insights. → Calorie Trend, Workout Frequency and Workout Types all draw, axis
  labels inside the chart rather than clipped. Stats show avg daily cal, most common type,
  sleep std dev.
- **S6** — Settings. → Account, Units, Appearance, Legal, Sign out, Delete account all present.

## F · Settings that change other screens

These are worth testing properly because their effect is somewhere other than where you
changed them.

- **T1** — Appearance → Light / Dark / System. → Applies immediately, including the drawer and
  an open modal, not just the screen behind them.
- **T2** — Set System, flip Android's dark mode with the app open. → Follows without a restart.
- **T3** — Change accent colour. → Buttons, highlights and the drawer's active row change
  together.
- **T4** — Units metric → imperial. → kg becomes lbs and cm becomes in *everywhere* — Body,
  the weight form, Insights.
- **T5** — Privacy and terms links. → A real page, not a 404. *(These previously pointed at a
  domain that is not ours and both 404'd. Store review treats a dead privacy link as a
  rejection — confirm on a device rather than assuming.)*
- **T6** — Account card. → Your actual name and email, not `--`.

## G · Android behaviour

Only true on a real phone; an emulator or a unit test will not tell you.

- **P1** — Rotate on several screens. → Stays portrait.
- **P2** — Look at the top and bottom edges. → Content clears the status bar and the gesture
  bar. *(Edge-to-edge is on, so the app draws behind the system bars and insets its own
  content.)*

  **This failed on the first run and has been fixed** (commit `5e98fd3`). The system home
  indicator was painted straight through the ENERGY and GOALS tab labels on every screen:
  `MainTabs.tsx` hardcoded `height: 64, paddingBottom: 8` and never read the safe-area
  insets, while `MobileScreen` and `AppDrawer` both did — which is why only the bottom edge
  was wrong. Re-check it rather than assuming; confirming it needs a build that postdates
  that commit.
- **P3** — Back, gesture and button, from a nested screen, a modal and a tab. → One level each
  time; never drops out of the app from a nested screen.
- **P4** — Background for a few minutes, return. → Same screen, data loaded, no re-login.
- **P5** — Airplane mode, then try to save. → Readable failure message. No crash, no endless
  spinner.
- **P6** — Airplane mode off, retry. → Works without restarting.
- **P7** — Check the app's storage and battery entries in Android settings afterwards. →
  Nothing alarming.

## H · Destructive — last, throwaway account only

- **X1** — Settings → Delete account → confirm. → Account gone, app returns to sign-in, old
  credentials rejected.

  **Irreversible.** No undo, no admin restore. Do not run this signed in as yourself.

---

## Known blockers

Not checks. These cannot pass today; they are here so a run does not stall on them.

**Google sign-in.** Needs an Android OAuth client in Google Cloud — package
`com.trackvibe.app` plus the SHA-1 of the keystore that signed *this* build — and
`EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` set on the build. Read the fingerprint with
`eas credentials -p android`: EAS holds its own keystore, so a local debug fingerprint is the
wrong one. The Android OAuth client is matched by package + fingerprint and is never passed to
the app as a value; the *web* client ID is the one the app sends, because the backend validates
the token's `aud`/`azp` against it.

**The password reset email itself.** A8 checks the request; the mail will not arrive.
`RESEND_API_KEY` is unset in Railway, and `email.ts` defaults the sender to
`onboarding@resend.dev`, Resend's shared sandbox, which only delivers to the Resend account's
own inbox. Both `RESEND_API_KEY` **and** `RESEND_FROM` need setting against a verified domain —
an API key alone gives a flow that works when you test it on yourself and silently reaches
nobody else. This is the highest-value fix available: it unblocks reset for the web at the same
time.

**Not built on mobile yet.** AI chat, AI insights, the exercises library, push notifications
and billing. Backend endpoints exist for the first three; the mobile screens do not.

---

## When iOS comes

Most of this plan carries over unchanged. The deltas:

- **G1–G2 differ.** `eas env:set --environment preview` covers both platforms, but the build
  is `eas build -p ios --profile preview`, which needs an Apple Developer account and a
  registered device UDID for an internal-distribution build. `development-simulator` builds
  for the simulator without either.
- **A10 inverts in meaning but not in outcome.** No Google button on iOS either — but on iOS
  it is hidden by a deliberate platform gate, not by missing configuration. App Store
  guideline 4.8 requires Sign in with Apple wherever a third-party social login is offered,
  and there is no Apple provider in the backend. `isBlockedByAppleGuideline()` hides it, with
  a test pinning the reason.
- **P1–P7 are Android-specific.** The iOS equivalents are the back-swipe gesture, the home
  indicator inset, and the microphone and speech-recognition permission prompts — iOS raises
  SIGABRT the first time an app touches `SFSpeechRecognizer` without
  `NSSpeechRecognitionUsageDescription`, so that prompt appearing correctly is a real check.

  Two of these carry straight over from what the Android run found. The home-indicator inset
  is the **same** class of bug as P2 and iOS has a home indicator too, so check the tab bar's
  bottom edge there specifically rather than trusting the Android fix to cover it. And the
  drawer's left-edge swipe competes with iOS's interactive back-swipe exactly as it competes
  with Android's system back gesture — expect the hamburger to be the only reliable way in on
  both platforms.
- **Everything in A (except A10), B, C, D, E, F and H applies as written.**
