# Plan — Parity: first-run onboarding and the profile

Status: **proposed**. No code has been written; this is the task write-up from the web-vs-Expo
audit of 2026-09-14.

**Goal:** a user who signs up on the phone ends first run with the same `user_profiles` row a
user who signs up in the browser does — and can change it afterwards without opening a browser.

**Architecture:** entirely client work in `mobile/`. `GET /api/profile` and `PUT /api/profile`
already exist (`backend/src/routes/profile.ts:12-13`), already accept partial writes, and
already return a usable placeholder for a user with no row
(`backend/src/controllers/profile.ts:13`). **No backend change, no API-shape change.**

**Spec:** `agent-os/specs/2026-09-14-1202-parity-onboarding-and-profile/` — read `shape.md`
first, including open question 2, which must be answered before Task 3 starts.

## Global constraints

- **CLAUDE.md rule 1: never break existing functionality.** The web wizard is live; nothing in
  `frontend/` changes in this spec.
- **CLAUDE.md rule 4: do not change API shapes.** Three consumers share `/api/profile`.
- The web is the reference: same five steps, same fields, same skip behaviour, same gate
  expression.
- Expo Go stays the workflow. The only candidate new dependency is the date picker in open
  question 2 — resolve it before writing Task 3, do not slip anything else in.
- No inline hex in `mobile/`; the AST guards in `mobile/src/theme/__tests__` fail the build.
- Weight in kg and height in cm, per `global/domain-conventions`. Dates are `YYYY-MM-DD`
  strings end to end.
- Every task ends green (`cd mobile && npx tsc --noEmit && npm test`) and is revertible alone.

## File structure

| File | Responsibility |
|---|---|
| `mobile/src/core/api/profile.ts` | **New.** `get()` / `upsert()` against `/api/profile` |
| `mobile/src/hooks/useProfile.ts` | **New.** React Query wrapper, mirroring the web hook |
| `mobile/src/lib/queryKeys.ts` | Add `profile` |
| `mobile/src/screens/onboarding/SetupWizardScreen.tsx` | **New.** The five steps |
| `mobile/src/screens/onboarding/steps/*.tsx` | **New.** One component per step |
| `mobile/src/navigation/RootNavigator.tsx` | Full-screen modal route + the gate |
| `mobile/src/screens/SettingsScreen.tsx` | Add the Profile and Cycle sections |
| `mobile/src/components/settings/ProfileSection.tsx` | **New.** The editable profile form |
| `mobile/src/components/settings/CycleSection.tsx` | **New.** Toggle + average cycle length |

---

## Task 1 — Expo can read and write the profile

**Verified gap:** `api/profile`, `profileApi` and `user_profiles` return **zero hits** across
`mobile/`. The app has no access to the profile at all.

- [ ] **Step 1: `mobile/src/core/api/profile.ts`** — an `ApiProfile` interface matching
      `frontend/src/core/api/health.ts:4-19` field for field (import the shared type if one
      already covers it rather than re-declaring), plus
      `get: () => request<ApiProfile>('/api/profile')` and
      `upsert: (data: Partial<ApiProfile>) => request<ApiProfile>('/api/profile', { method: 'PUT', body: data })`.
- [ ] **Step 2: Add `profile: ['profile'] as const`** to `mobile/src/lib/queryKeys.ts`. Keys
      are centralised on both clients; never inline the array.
- [ ] **Step 3: `mobile/src/hooks/useProfile.ts`**, mirroring
      `frontend/src/hooks/useProfile.ts`: explicit `staleTime: 5 * 60 * 1000`, the same
      `{ setupCompleted: false, waterGoalGlasses: 8, cycleTrackingEnabled: false }` fallback,
      `updateProfile` writing the response back with `setQueryData` (not `invalidateQueries`),
      and the error exposed as a display string.
- [ ] **Step 4: Test** `mobile/src/hooks/__tests__/useProfile.test.tsx` — the fallback shape
      when the API returns no `id`, and that an update seeds the cache rather than refetching.
- [ ] **Step 5: Verify + commit.** `cd mobile && npx tsc --noEmit && npm test`

## Task 2 — The profile section in Expo's Settings

Ships **with or before** Task 3 (see open question 1): a wizard the user skips must not leave
them with nowhere to set these values.

- [ ] **Step 1: `mobile/src/components/settings/ProfileSection.tsx`**, matching
      `frontend/src/components/settings/ProfileSection.tsx`: sex, date of birth, height (cm),
      current weight (kg), target weight (kg), activity level, water goal (glasses), and the
      derived BMI readout. Paper `TextInput mode="outlined"` for numbers with
      `keyboardType="numeric"`; Paper `RadioButton.Group` or a `Menu` for the two enums.
- [ ] **Step 2: Use the web's option lists verbatim** — sex is
      `male | female | other | prefer_not_to_say`; activity is
      `sedentary | light | moderate | active | very_active` with the labels
      `ProfileSection.tsx:111-115` uses. These are written to the DB, so an invented value
      would be a data bug, not a copy difference.
- [ ] **Step 3: One explicit Save**, like the web — the profile form is not per-field
      autosave. Disable while `isUpdating`; success and failure both go through
      `react-native-toast-message`, which is how every other Expo screen reports.
- [ ] **Step 4: `mobile/src/components/settings/CycleSection.tsx`** — the toggle and average
      cycle length (15-60), rendered only when `profile.sex === 'female'`, matching
      `frontend/src/pages/Settings.tsx:64`. Optimistic toggle that reverts on failure, as
      `CycleSection.tsx:23-35` does.
- [ ] **Step 5: Register both sections** in `SettingsScreen.tsx`. Note the screen's
      `SETTINGS_SECTION_TITLES` contract (`:34`) is load-bearing — a section added to the JSX
      without being added to that list is a compile error, and its test pins the list exactly.
      Update both, keeping the web's relative order: Profile and Cycle sit after Account and
      before Units.
- [ ] **Step 6: Extend `mobile/src/screens/__tests__/SettingsScreen.test.tsx`** for the new
      titles and for the female-only cycle condition.
- [ ] **Step 7: Verify + commit.**

## Task 3 — The first-run wizard

**Verified gap:** `onboard`, `welcome`, `setup` and `setupCompleted` return zero hits across
`mobile/`. The web's flow is `SetupWizard.tsx`, gated at `Home.tsx:149`.

> Answer open question 2 (date picker vs three inputs) before starting.

- [ ] **Step 1: `mobile/src/screens/onboarding/SetupWizardScreen.tsx`** — five steps in the
      web's order: Welcome, Basic Info (sex, DOB), Body Stats (height, current weight, target
      weight, live BMI), Activity (five levels + cycle toggle when sex is female), Complete
      (BMI and a summary). Progress is the same five-segment bar (`SetupWizard.tsx:76-83`).
- [ ] **Step 2: Same navigation contract** — Skip on step 0, Back on every later step,
      "{n} of 5" in the middle, Next / Get Started on the right (`SetupWizard.tsx:274-286`).
      44px hit areas throughout.
- [ ] **Step 3: Skip writes `{ setupCompleted: true }` and nothing else**
      (`SetupWizard.handleSkip:38-45`). Finish writes every collected field plus
      `setupCompleted: true`, omitting empty ones — `undefined`, never `''` or `0`, so the
      partial-write path in `models/profile.ts:77-95` applies.
- [ ] **Step 4: The gate lives in `RootNavigator`,** not in a screen: inside the authenticated
      branch, when `!profileLoading && !profile.id && !profile.setupCompleted`, render the
      wizard instead of `AppStack`. Same expression as `Home.tsx:149`. **Do not persist a
      "seen onboarding" flag in AsyncStorage** — the server row is the only source of truth,
      or a reinstall re-runs the wizard and a web-onboarded user gets it twice.
- [ ] **Step 5: While the profile query is loading, show the existing `LoadingScreen`**
      (`RootNavigator.tsx:65-87`) rather than flashing the tab bar and then covering it.
- [ ] **Step 6: Tests** — `SetupWizardScreen.test.tsx`: Skip writes only `setupCompleted`;
      Finish writes the full payload with empty fields omitted; the cycle step appears only
      when sex is female; BMI is computed from the entered height and weight. Plus a
      `RootNavigator` test that the gate flips on `profile.id`.
- [ ] **Step 7: Verify + commit.**

## Verification for the whole spec

- [ ] `cd mobile && npx tsc --noEmit && npm test`
- [ ] `cd frontend && npx tsc --noEmit` — untouched, but the shared types move under it
- [ ] Manual, once: register a brand-new account **in Expo**, complete the wizard, then open
      the same account on the web. Settings → Profile must already show what was entered on
      the phone, and Home must **not** show the web wizard. Then the reverse: onboard on the
      web, open Expo, and confirm the wizard does not appear.
- [ ] Manual, once: with the profile filled in, ask the AI coach something personal. Before
      this spec a native-only account reaches the model as `Profile not set up yet`
      (`backend/src/services/chat.ts:206`); afterwards it should carry sex, age, height,
      weight, target and activity.
