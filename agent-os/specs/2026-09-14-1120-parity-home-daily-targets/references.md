# Reference — The Full Trace

Every number either Home renders, traced to the hook and endpoint behind it. Read from code
on both sides; nothing here is inferred from a screenshot or a running app.

## Metric-by-metric

| Home number | Web hook → endpoint | Expo hook → endpoint | Agree? |
|---|---|---|---|
| Calorie **target** | `useMacroGoals().calorieGoal` → `useProfile` → `GET /api/profile` (`macroCarbs/Fat/Protein`), default **2400** | `useGoals()` → `GET /api/goals`, `calories`+`daily`, default **2000** | **No** |
| Calories **consumed** today | `useEnergy().foodEntries`, `isSameDay` filter (`Home.tsx:65`) | `useEnergy().foodEntries`, `getPeriodRange('daily')` filter (`HomeScreen.tsx:101,109`) | Yes — same value, different helper |
| Calories **left** | not rendered | `max(target − consumed, 0)` (`HomeScreen.tsx:183`) | Expo only |
| Protein consumed | sum of today's entries (`Home.tsx:68`) | sum of today's entries (`HomeScreen.tsx:111`) | Yes |
| Protein **target** | `macroGoals.protein` → profile, default **120 g** | none — bare "Ng / today" tile | **No** |
| Carbs / fat consumed + target | rendered with profile targets (`Home.tsx:77-78`) | not rendered | Web only |
| Sleep | **today's** `getCheckInByDate(today).sleepHours` (`Home.tsx:109`), pill hidden at 0 | **weekly average** of check-ins with `sleepHours` (`HomeScreen.tsx:115-120`), `--` at 0 | **No** |
| Workouts this week | not rendered anywhere on Home | count in `[startOfWeek, endOfWeek]` vs `goals` workouts/weekly, default **4** | Expo only |
| Meals logged | only feeds `progressMessage` prose (`Home.tsx:81-86`) | numeric in hero meta (`HomeScreen.tsx:146`) | Partly |
| Weight | `useWeight()` → `GET /api/weight-entries`; latest, `profile.targetWeight`, 7-entry trend + sparkline; quick-tile pill for today | no client, no hook, not rendered | Web only |
| Water | `useWater()` → `GET /api/water-entries`; goal `profile.waterGoalGlasses \|\| 8` | no client, no hook, not rendered | Web only |
| Streaks | `useStreaks()` → `GET /api/streaks` (workout/food/water) | no client, no hook, not rendered | Web only |
| Cycle day | `useCycle()` → `GET /api/cycle-entries`, gated on `profile.cycleTrackingEnabled` | no client, no hook, not rendered | Web only |
| Recent activity | `foodEntries` + `workouts` merged, newest 5 (`Home.tsx:88-106`) | not rendered | Web only |

The five "web only" rows are the sibling PR's subject
(`agent-os/specs/2026-09-14-1122-parity-home-surface/`); they are listed here so this table is
the complete trace the audit was asked for.

## Files read on the web side

- `frontend/src/pages/Home.tsx` — the whole screen; lines 41 (`useMacroGoals`), 63-79 (today's
  totals and macro rows), 108 (`calPct`), 109 (sleep), 111-114 (today's weight)
- `frontend/src/hooks/useMacroGoals.ts` — `DEFAULTS` at :10, the kcal derivation at :30
- `frontend/src/hooks/useProfile.ts` — the profile query and its unloaded fallback object
- `frontend/src/core/api/health.ts` — `ApiProfile` (:4-19) and the profile/weight/water/cycle/
  streak clients Expo has no equivalent of
- `frontend/src/hooks/useGoals.ts`, `useEnergy.ts`, `useWeight.ts`, `useWater.ts`,
  `useStreaks.ts`, `useCycle.ts`
- `frontend/src/components/home/MacroGoalModal.tsx` — :89 recomputes the kcal sum inline
- `frontend/src/components/onboarding/SetupWizard.tsx` — :47-65 confirm no macro write in the
  first-run path, which is why 2400 is the common case
- `frontend/src/components/goals/GoalModal.tsx` — :31 defaults new goals to `calories`, so the
  Goals page writes the exact row the web Home ignores
- `frontend/src/pages/Home.test.tsx` — :72-78 pin `calorieGoal: 2400`
- `frontend/src/lib/queryClient.ts` — the key registry and the 60 s global `staleTime`

## Files read on the Expo side

- `mobile/src/screens/HomeScreen.tsx` — the whole screen; :97-131 is the entire derived-data
  block, :106-107 the workouts target, :112-113 the calorie target
- `mobile/src/hooks/useGoals.ts`, `useEnergy.ts`, `useWorkouts.ts` — the three hooks Home uses
- `mobile/src/lib/queryClient.ts` / `queryKeys.ts` — same 60 s default as the web; the key
  registry has four entries against the web's twelve
- `mobile/src/core/api/` — `auth`, `client`, `food`, `goals`, `pagination`, `users`,
  `workouts`. There is **no** `health.ts`, which is the mechanical reason Expo cannot see a
  macro target even if it wanted to.
- `mobile/src/screens/GoalsScreen.tsx` — the precedent: :15 imports `computeGoalProgress` from
  `@trackvibe/shared/domain`, :30-35 exports pure wiring so it can be tested render-free
- `mobile/src/navigation/RootNavigator.tsx` — confirms there is no first-run/profile gate

## Shared and backend

- `packages/shared/src/domain/goals.ts` — the extracted goal-progress calculator; its header
  comment is the model for why `targets.ts` belongs beside it
- `packages/shared/src/domain/dates.ts` — `getPeriodRange`, `WEEK_SUNDAY`
- `packages/shared/package.json` — subpath exports; `./domain` is already wired for both
  clients
- `backend/src/models/profile.ts:8` — the `RETURNING` list, confirming `macro_carbs`,
  `macro_fat`, `macro_protein` are already on the wire
- `backend/src/db/schema.ts:228,232` — `water_goal_glasses ... DEFAULT 8` (which clears the
  web's `|| 8`) and the nullable `macro_carbs`
- `backend/src/schemas/routeSchemas.ts:153` — macro bounds (1–1500), so a shared default of
  300/80/120 is inside the accepted range
- `backend/src/routes/index.ts:50-56` — `profileRouter`, `weightRouter`, `waterRouter`,
  `cycleRouter`, `streakRouter` all mounted; every endpoint Expo is missing a client for
  already exists

## Checked and cleared — reported honestly

- **Whole-history reads.** Expected a divergence; there isn't one. Both clients page through
  everything via the same `createRequestAllPages` from `@trackvibe/shared/api`. It is a shared
  concern, not a parity one, and out of scope here.
- **The water `|| 8` default.** Looks like an invented client default; it mirrors the column's
  `NOT NULL DEFAULT 8`, so it is only reachable pre-load. Not filed.
- **`useGoals`.** Near-verbatim on both sides — same key, mapper, mutation shape. Only
  `staleTime` differs.
- **Week boundary.** Both use Sunday-start. No off-by-a-day.
- **Date handling.** Both go through `toLocalDateString` from the shared module for writes; no
  `.toISOString().slice(0,10)` anywhere in either Home path.
- **Today's calorie and protein sums.** Different filter helpers, identical results.

## Prior specs leaned on

- `agent-os/specs/2026-08-15-1200-single-role-nav-and-custom-exercises/` — the spec format,
  and the "record the data-lifecycle argument in the shape" habit
- `agent-os/specs/2026-09-12-1230-mobile-foundation/` — the extraction of `packages/shared`
  this work extends
</content>
