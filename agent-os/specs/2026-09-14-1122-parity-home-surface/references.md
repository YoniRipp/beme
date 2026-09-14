# Reference — What Was Read

Everything below was read from code in both packages. Nothing here came from a running app,
a simulator or a screenshot.

## The two screens

- `frontend/src/pages/Home.tsx` (348 lines) — the reference. Key lines:
  - `:149-151` the `SetupWizard` gate
  - `:155-169` `PageHeader` — date kicker, "Hey {firstName}", progress message, profile button
  - `:173-174` the comment explaining why the fuel card waits on `energyLoading` only
  - `:189-241` the fuel card: `ProgressRing` + three macro bars + edit pencil
  - `:244` `StreakCard`
  - `:248-249` the comment explaining the 2×2 grid and the logged-today pills
  - `:250-265` the four `QuickTile`s
  - `:268-271` `WaterTracker` + `WeightProgress` side by side
  - `:273` `CycleTracker`, gated on `profile.cycleTrackingEnabled`
  - `:276-312` recent activity, gated on both queries, with its own skeleton
  - `:316-345` six modals
- `mobile/src/screens/HomeScreen.tsx` (215 lines):
  - `:95,133` the whole-screen loading gate over all three queries
  - `:136-139` `MobileScreen` title/subtitle — the second heading
  - `:140-153` the hero card: number + linear bar, no macros
  - `:155-186` four `MetricCard`s in two rows
  - `:188-198` three stacked action buttons
  - `:200-210` the "Set your first goal" prompt

## Web components behind the missing cards

- `frontend/src/components/home/StreakCard.tsx` — three streak tiles; returns `null` when all
  are 0 (`:22`), which is the empty-state behaviour to copy
- `frontend/src/components/home/WaterTracker.tsx` — glasses/goal, ml, ±1; goal falls back to
  `profile.waterGoalGlasses || 8` (`:13`)
- `frontend/src/components/home/WeightProgress.tsx` — latest, target delta, kg/wk trend,
  7-bar sparkline (`:83-100`), "No weight logged yet" empty state (`:102-112`)
- `frontend/src/components/home/CycleTracker.tsx` — current cycle day, days to next, log
  period; 28-day fallback at `:13`
- `frontend/src/components/home/WeightLogModal.tsx`, `MacroGoalModal.tsx` — the two modals
  Expo has no equivalent of
- `frontend/src/components/ui/progress-ring.tsx` — 132 px default, `role="progressbar"` with
  `aria-valuetext`; the accessibility contract Expo's ring should match
- `frontend/src/components/ui/quick-tile.tsx` — 78 px tile, icon + optional pill + label
- `frontend/src/components/ui/page.tsx` — `Page` / `PageHeader` / `SectionHeader`, i.e. what
  `MobileScreen` is the Expo analogue of
- `frontend/src/components/shared/ContentWithLoading.tsx` — skeleton-or-spinner section gate
- `frontend/src/components/onboarding/SetupWizard.tsx` — 5 steps; `:47-65` shows it writes
  sex, DOB, height, current/target weight, activity level and cycle settings

## Web hooks behind the missing cards

- `frontend/src/hooks/useWater.ts` — 30 s `staleTime`; the `latestSetRef` out-of-order guard at
  `:49,66,73`; `ML_PER_GLASS = 250` mirroring the backend
- `frontend/src/hooks/useWeight.ts` — `:16` calls `weightApi.list()` **with no window**
- `frontend/src/hooks/useStreaks.ts` — one query, 5 min, three named accessors
- `frontend/src/hooks/useCycle.ts` — 2 min, `setQueryData` on add/delete
- `frontend/src/hooks/useProfile.ts` — the unloaded-profile fallback object
- `frontend/src/core/api/health.ts` — all five clients in one file; the thing Expo is missing

## Expo side

- `mobile/src/core/api/` — `auth`, `client`, `food`, `goals`, `pagination`, `users`,
  `workouts`. No `health.ts`.
- `mobile/src/hooks/` — `useDebounce`, `useEnergy`, `useGoals`, `useSettings`, `useWorkouts`.
  Five hooks against the web's forty-plus.
- `mobile/src/lib/queryKeys.ts` — four keys against the web's twelve
- `mobile/src/components/shared/` — `ConfirmDialog`, `EmptyState`, `LoadingView`, `MetricCard`,
  `MobileFoodCard`, `MobileGoalCard`, `MobileScreen`, `MobileWorkoutCard`, `PeriodSelector`,
  **`ProgressRing`**, `SearchBar`
- `mobile/src/components/shared/ProgressRing.tsx` — SVG ring, centred value, theme-safe, and
  **imported by nothing**: the only other reference in the repo is
  `mobile/src/theme/__tests__/noFrozenPaletteImports.test.ts`
- `mobile/src/components/shared/MobileScreen.tsx` — `:38-49` the safe-area padding, `:41-46`
  the title/subtitle block that becomes the second heading
- `mobile/src/navigation/MainTabs.tsx:50` — `headerTitle: 'TrackVibe'` on the Home tab, the
  first heading
- `mobile/src/navigation/RootNavigator.tsx:112-124` — auth gate straight to `MainTabs`; no
  first-run path, no profile gate
- `mobile/src/screens/GoalsScreen.tsx` — the pattern for adding logic to an Expo screen:
  shared calculator, pure exported wiring, render-free test (`:18-35`)

## Backend — nothing needed

- `backend/src/routes/index.ts:50-56` — `profileRouter`, `weightRouter`, `waterRouter`,
  `cycleRouter`, `streakRouter`, all mounted
- `backend/src/controllers/weight.ts:12-17` — `parseOptionalPagination(req.query)`, so an
  unwindowed `GET /api/weight-entries` returns everything; this is what makes the web's
  `useWeight` an unbounded read
- `backend/src/models/weight.ts:29` — `findByUserId(userId, startDate?, endDate?, pagination?)`;
  the window the client simply never passes
- `backend/src/models/streak.ts:24-29` — all rows for a user ordered by type; bounded by the
  five streak types, so no window needed
- `backend/src/db/schema.ts:228` — `water_goal_glasses int NOT NULL DEFAULT 8`

## Checked and cleared — reported honestly

- **`MobileScreen` safe areas.** Expected the web's `.pb-safe` discipline to be missing on
  Expo. It isn't: `MobileScreen.tsx:40` pads by `useSafeAreaInsets().bottom`. Not filed.
- **Expo's card styling.** Expected inline hex. There is none — the whole screen goes through
  `useThemedStyles`, enforced by an AST guard. Not filed.
- **`EmptyState` and `LoadingView`.** Expo already has both shared primitives; the gap is that
  Home uses `LoadingView` as a whole-screen gate, not that the primitive is missing.
- **Modal pattern.** Expo's stack-with-`presentation: 'modal'` is a legitimate native
  equivalent of the web's `Dialog`. Not a misalignment — new forms should follow it rather
  than port the web's dialogs.
- **Recent activity needs no new endpoint.** Both Expo hooks already hold the food entries and
  workouts the merge needs.

## Related

- Sibling spec `agent-os/specs/2026-09-14-1120-parity-home-daily-targets/` — the *numbers* the
  two Homes disagree about. Its Task 4 adds the profile slice of `mobile/src/core/api/health.ts`
  that this spec's Task 2 extends.
- `agent-os/specs/2026-08-15-1200-single-role-nav-and-custom-exercises/` — the spec format
- `agent-os/specs/2026-09-12-1230-mobile-foundation/` — the `packages/shared` extraction both
  specs build on
</content>
