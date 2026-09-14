# Code Read Before Writing This Spec

A code audit. Nothing here came from a simulator or a browser.

## The web flow being matched

- `frontend/src/components/onboarding/SetupWizard.tsx` — the five steps (`STEPS`, line 11),
  the full-screen overlay (72), the progress bar (76-83), `handleSkip` writing only
  `setupCompleted` (38-45), `handleFinish` writing the collected fields (47-65), the
  female-only cycle block (216-244), the Skip/Back/counter/Next row (274-286). It writes
  neither macros nor the water goal.
- `frontend/src/pages/Home.tsx:149-151` — the gate:
  `!profileLoading && !profile.id && !profile.setupCompleted`, and `onComplete` reloading the
  page
- `frontend/src/hooks/useProfile.ts` — query key, `staleTime` 5 min, `setQueryData` on
  success, the no-row fallback object (32)
- `frontend/src/core/api/health.ts:4-25` — `ApiProfile` and `profileApi`
- `frontend/src/components/settings/ProfileSection.tsx` — the post-onboarding editor: the
  form's field set (18-26), DOB normalisation to `YYYY-MM-DD` (28-40), the sex and activity
  option lists (72-77, 111-115), BMI (66-68), one explicit Save (134-136)
- `frontend/src/components/settings/CycleSection.tsx` — optimistic toggle reverting on failure
  (23-35), cycle length 15-60 (69-77)
- `frontend/src/pages/Settings.tsx:64` — `{profile.sex === 'female' && <CycleSection />}`

## Expo, as it stands

- `mobile/src/screens/SettingsScreen.tsx` — Account (name/email, read-only), Units,
  Appearance, Sign Out. `SETTINGS_SECTION_TITLES` and why it is load-bearing (21-36).
- `mobile/src/navigation/RootNavigator.tsx` — `AppStack`'s modal screens (41-60), the
  `authLoading` gate and `LoadingScreen` (65-87, 116-118)
- `mobile/src/lib/queryKeys.ts` — four keys, no `profile`
- `mobile/src/hooks/useGoals.ts`, `useWorkouts.ts` — the hook shape a `useProfile` should
  follow here
- `mobile/src/screens/GoalFormScreen.tsx`, `WorkoutFormScreen.tsx` — how an Expo form is
  built: Paper `TextInput mode="outlined" label=…`, `SegmentedButtons`, `RadioButton.Group`,
  `react-native-toast-message` for the result
- `mobile/package.json` — no date-picker dependency of any kind (open question 2)
- Greps that came back empty and are the finding: `onboard|welcome|setup|setupCompleted` and
  `api/profile|profileApi|user_profiles`, both across all of `mobile/`

## Backend — what already supports this

- `backend/src/routes/profile.ts:12-13` — `GET` and `PUT /api/profile`, both `withUser`
- `backend/src/controllers/profile.ts:13` — the no-row response
  `{ setupCompleted: false, waterGoalGlasses: 8, cycleTrackingEnabled: false }`, with no `id`
- `backend/src/models/profile.ts:69-95` — the partial upsert, and the comment explaining that
  binding an explicit NULL would bypass the column DEFAULT and 23502 on the first write of a
  brand-new user
- `backend/src/models/profile.ts:10-23` — DATE columns hand-formatted to `YYYY-MM-DD` to avoid
  the `toISOString` day rollback
- `backend/src/schemas/routeSchemas.ts:152` — `setupCompleted` is an optional boolean on the
  upsert schema
- `backend/src/types/domain.ts:180-195` — `UserProfile`

## What consumes the profile (the cost of not having one)

- `backend/src/services/insights.ts:63-65` — the columns the insights prompt selects;
  `:159-176` — `buildProfileBlock`, which returns `User profile: Not set up yet.` for an empty
  row; `:194-196` — the weight-goal block, skipped without current and target weight
- `backend/src/services/chat.ts:125-136, 206` — the same profile block in the chat prompt
- `frontend/src/hooks/useMacroGoals.ts:10, 30` — the macro defaults and `calorieGoal`.
  Confirms PR #302's finding and the negative result below.

**Negative result, deliberately recorded:** `bmr`, `tdee`, `mifflin` and `harris-benedict`
return zero hits across `backend/src`, `frontend/src`, `mobile/src` and
`packages/shared/src`. Height, weight and activity level are **not** used to compute a calorie
target anywhere. The brief assumed they were; they are not.

## Prior work leaned on

- PR #302 — `Parity: Home — one set of daily targets, not two`. Establishes that the web's
  calorie target is `macroCarbs*4 + macroFat*9 + macroProtein*4` (default 2400) and Expo's is
  the `goals` table (default 2000), and that `SetupWizard` writes neither. This spec does not
  touch either number.
- `agent-os/specs/2026-09-12-1230-mobile-foundation/references.md:55` — flags the
  `user_profiles` NOT NULL drift "breaking new-user onboarding". Re-checked here: fixed.
- `agent-os/specs/2026-09-14-1200-parity-auth-surface/` — the sibling spec; a user reaches
  this wizard immediately after the signup screen that spec covers.
