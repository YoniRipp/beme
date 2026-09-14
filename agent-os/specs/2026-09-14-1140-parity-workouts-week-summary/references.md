# Reference Implementations Studied

Every claim in `shape.md` was read out of these files on both sides; nothing came from a
screenshot or from running either client.

## The reference (web)

- `frontend/src/pages/Body.tsx` — the whole surface being ported: `groupWorkoutsByDate`, the
  four date windows, `EARLIER_PAGE_SIZE`, the goal card, `hasWorkoutByDay` / `todayIdx`, the
  filter chip row, both empty states
- `frontend/src/components/body/WorkoutCard.tsx` — completion toggle, `formatDate` /
  `getWeightUnit` usage, the 3-exercise preview and "+N more", the `aria-label`s
- `frontend/src/components/ui/progress-ring.tsx` — takes `pct` as 0–1 and carries
  `role="progressbar"` with a spoken `valueText`
- `frontend/src/components/shared/EmptyState.tsx` — the `firstRun = !!Icon` split that gives
  the two visual treatments the Body page relies on
- `frontend/src/components/shared/AddAnotherCard.tsx` — the dashed trailing affordance
- `frontend/src/hooks/useWorkouts.ts` — `toggleWorkoutCompleted`, and the `staleTime` +
  `setQueryData` shape mobile's hook already mirrors
- `frontend/src/lib/utils.ts` — `formatDate(date, dateFormat)` and
  `getWeightUnit(units) => 'kg' | 'lbs'`, the two helpers mobile lacks

## The client being aligned (Expo)

- `mobile/src/screens/BodyScreen.tsx` — the two-bucket `groupWorkouts()` that drops future
  workouts, the metric row, the three-segment filter, the single empty state
- `mobile/src/components/shared/MobileWorkoutCard.tsx` — hardcoded `EEE, MMM d` and `kg`,
  no completion control
- `mobile/src/components/shared/ProgressRing.tsx` — already exists, takes 0–100 plus
  `displayValue`; hardcodes its track colour, which belongs to the design-system agent
- `mobile/src/components/shared/MetricCard.tsx` / `EmptyState.tsx` / `MobileScreen.tsx` —
  the pieces the current header is built from
- `mobile/src/hooks/useWorkouts.ts` — mutations and `buildWorkoutUpdateBody`, which already
  forwards `completed`, so the toggle needs no wire work
- `mobile/src/screens/HomeScreen.tsx` — reads the weekly `workouts` goal from the goals API
  with a `|| 4` fallback; the source of open question #1

## Shared ground both clients already stand on

- `packages/shared/src/types/workout.ts` — `WORKOUT_TYPES` is
  `['strength','cardio','flexibility','sports']`; both `types/workout.ts` files are bare
  re-exports of it
- `packages/shared/src/domain/dates.ts` — `WEEK_SUNDAY`, `getPeriodRange`,
  `toLocalDateString`, `parseLocalDateString`
- `packages/shared/src/domain/goals.ts` — `computeGoalProgress` already counts workouts in a
  period; the natural home for a shared weekly-workout-goal helper
- `packages/shared/src/settings/types.ts` — `AppSettings.units` / `dateFormat`, read by the
  web's `AppContext` and by `mobile/src/context/SettingsContext.tsx` from the same
  `trackvibe_settings` key

## Backend, to confirm nothing new is needed

- `backend/src/routes/workout.ts` — `GET /api/workouts`, `PATCH /api/workouts/:id`
- `backend/src/schemas/routeSchemas.ts` — `createWorkoutSchema` / `updateWorkoutSchema`
  accept all four workout types and the `completed` flag

## Prior specs leaned on

- `agent-os/specs/2026-09-12-1230-mobile-foundation/` and `2026-09-12-1700-mobile-theme-shell/`
  — the shape of a mobile-side task list and the theming rules the port must not violate
- `agent-os/specs/2026-08-11-0730-workout-per-exercise-editing/` — why the web's list and
  its editor are separated the way they are
