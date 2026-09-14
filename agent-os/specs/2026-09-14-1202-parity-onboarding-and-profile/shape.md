# Parity: first-run onboarding and the profile — Shaping Notes

## Why this exists

The web runs a five-step `SetupWizard` — Welcome, Basic Info, Body Stats, Activity, Complete —
that takes over Home until the user's profile exists, and can be skipped
(`frontend/src/components/onboarding/SetupWizard.tsx`, gated at `frontend/src/pages/Home.tsx:149`).

**Expo has no first-run flow of any kind.** Grepping `mobile/` for `onboard`, `welcome`,
`setup` and `setupCompleted` returns nothing. Grepping for `api/profile`, `profileApi` or
`user_profiles` also returns nothing: the Expo app has **no read or write access to the
profile at all**. Its Settings screen shows Name and Email as read-only list rows
(`mobile/src/screens/SettingsScreen.tsx:54-57`) and stops there.

So a user who only ever uses the phone has a `user_profiles` row that never gets created. This
spec is about what that costs and what it takes to close.

## What it actually costs — measured, not assumed

The brief suggested the missing height/weight/activity feed the calorie targets PR #302 is
about. **They do not, and that is worth saying plainly.** There is no BMR or TDEE calculation
anywhere in this repo — `bmr`, `tdee`, `mifflin` and `harris-benedict` return zero hits across
`backend/src`, `frontend/src`, `mobile/src` and `packages/shared/src`. PR #302 established
where the calorie number really comes from (web: profile macro grams, default 2400; Expo: the
`goals` table, default 2000), and `SetupWizard` writes neither.

What a missing profile *does* cost, each verified:

| Consumer | Behaviour with no profile row |
|---|---|
| AI insights (`backend/src/services/insights.ts:161`) | Emits the literal string `User profile: Not set up yet.` into the model prompt |
| AI insights weight goal (`:194-196`) | Returns `''` — no current/target weight, so no progress framing at all |
| AI chat (`backend/src/services/chat.ts:125-136, 206`) | Same: `Profile not set up yet` instead of sex, age, height, weight, target, activity |
| Cycle tracking (`frontend/src/pages/Settings.tsx:64`) | `CycleSection` renders only when `profile.sex === 'female'`, so the feature is unreachable |
| BMI (`ProfileSection.tsx:66-68`, `SetupWizard.tsx:67-69`) | Never shown — it is derived from height and weight, not stored |
| Water goal (`frontend/src/pages/Water.tsx:18`, `home/WaterTracker.tsx:13`) | Falls back to 8 glasses, which is also the column default, so this one is harmless |

The headline is the AI. TrackVibe's differentiator is voice and an AI coach, and for a
native-only user that coach is told, in as many words, that it knows nothing about them.

The recovery path today is "sign in on the web once, and the wizard appears" — the gate is
`!profile.id && !profile.setupCompleted`, so it fires on the first web visit no matter how long
the account has existed. That is a workaround, not a design.

## Scope

1. **A first-run flow in Expo** covering the same five steps and writing the same fields.
2. **A profile section in Expo's Settings**, so those values can be changed afterwards — the
   web's `ProfileSection` (sex, date of birth, height, weight, target weight, activity level,
   water goal, BMI readout) has no Expo counterpart.
3. **Cycle tracking in Expo**, on the same `sex === 'female'` condition the web uses, since it
   is a profile-backed setting and lands with the same plumbing.

All three are client work against `GET /api/profile` and `PUT /api/profile`
(`backend/src/routes/profile.ts:12-13`), which already exist, already accept partial writes,
and already handle the brand-new-user case — `models/profile.ts:69-95` deliberately omits
absent fields from the INSERT so the column defaults apply. **No backend change.**

## Decisions

- **Match the web's five steps and the web's field set.** Welcome / Basic Info (sex, DOB) /
  Body Stats (height, current weight, target weight, live BMI) / Activity (five levels, plus
  the cycle-tracking toggle when sex is female) / Complete (BMI and a summary). Same order,
  same copy, same skip affordance on step 0. The point is that a user who set up on the web
  and a user who set up on the phone end with the same row.
- **The gate is the same expression, not a local flag.** Expo checks
  `!profileLoading && !profile.id && !profile.setupCompleted`, the same as
  `frontend/src/pages/Home.tsx:149`. Do **not** store "seen onboarding" in AsyncStorage: a
  device-local flag would re-run the wizard after a reinstall and skip it for a user who set up
  on the web.
- **Skip writes `setupCompleted: true` and nothing else**, exactly as
  `SetupWizard.handleSkip` does. Skipping must not be indistinguishable from never starting.
- **It presents as a modal stack screen, not a tab.** `RootNavigator`'s `AppStack` already
  hosts modal screens (`WorkoutForm`, `FoodEntryForm`, …); onboarding becomes a
  `presentation: 'fullScreenModal'` screen shown from the app root, so the tab bar is not
  visible mid-wizard. The web achieves the same with `fixed inset-0 z-50`
  (`SetupWizard.tsx:72`).
- **The profile is React Query state, not context.** A new `mobile/src/hooks/useProfile.ts`
  mirroring `frontend/src/hooks/useProfile.ts`: `staleTime` 5 minutes, `setQueryData` on
  success, a `profile` key added to `mobile/src/lib/queryKeys.ts`. Both the wizard and the
  settings section consume it, so a save in one is visible in the other without a refetch.
- **Metric units in the form, matching the web.** Height in cm, weight in kg. The Units
  setting is a display preference and today it converts nothing on either client — see the
  settings spec, which owns that question. The wizard must not be where a conversion gets
  invented.
- **`waterGoalGlasses` belongs to the settings profile section, not the wizard** — that is how
  the web splits it (`SetupWizard` never writes it; `ProfileSection.tsx:122` does).

## What already matches — checked, not assumed

- **`PUT /api/profile` is genuinely partial-write safe.** The `user_profiles` NOT NULL drift
  that broke new-user onboarding (noted in the mobile-foundation spec's `references.md`) is
  fixed: the upsert only names the columns actually supplied, so defaults apply on insert.
  Expo can write two fields at a time without a 23502.
- **`GET /api/profile` returns a usable object for a user with no row** — the controller
  substitutes `{ setupCompleted: false, waterGoalGlasses: 8, cycleTrackingEnabled: false }`
  (`backend/src/controllers/profile.ts:13`), with no `id`, which is exactly what the gate
  tests. Expo needs no special-casing.
- **Dates are already `YYYY-MM-DD` on the wire.** `models/profile.ts:10-23` formats the DATE
  column by hand precisely to avoid the `toISOString` day-rollback, so the Expo date input can
  send and receive plain day strings.
- **Both clients already share the profile's shape** through `@trackvibe/shared` — the field
  names in `frontend/src/core/api/health.ts:4-19` match `backend/src/types/domain.ts:180-195`.

## Open questions for the owner

1. **Should the wizard also be reachable after it is dismissed?** On the web it is not: once
   `setupCompleted` is true, the only route back to those fields is Settings → Profile. If
   Expo ships the wizard before it ships the settings section, a user who skips has no way to
   set anything. **Recommendation: ship Task 2 (the settings section) in the same release as
   Task 1, and keep the web's "no re-entry" behaviour.**
2. **Date of birth on a phone — this one needs a decision before Task 1 starts.** The web uses
   a three-part `DateOfBirthInput` honouring the user's date-format setting
   (`frontend/src/components/settings/DateOfBirthInput.tsx`). Expo has nothing equivalent and
   **no date-picker dependency at all**: `mobile/package.json` has neither
   `@react-native-community/datetimepicker` nor `react-native-paper-dates`. Two ways out:
   - **A native picker** via `npx expo install @react-native-community/datetimepicker`. It is
     the platform-correct control and works in Expo Go — but it is a new dependency, which
     `global/tech-stack` says to raise rather than assume.
   - **Three numeric Paper inputs**, the same day/month/year decomposition the web control
     uses, with no new dependency.

   **Recommendation: the native picker**, because a scrolling wheel is what an iOS user expects
   for a birth date and because it removes the date-format question from the form entirely.
   Fall back to the three inputs if the owner would rather not add the package.
3. **Should onboarding ask for notification permission?** Neither client does today. iOS
   convention is to ask in context, not at first run. **Recommendation: no** — and the
   settings spec covers notifications properly.
