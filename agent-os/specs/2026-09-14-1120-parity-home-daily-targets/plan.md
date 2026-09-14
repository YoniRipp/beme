# Plan — Home Parity: One Set of Daily Targets

Status: **done.** The product call the write-up left open (Q1) was made by the owner —
**the `goals` table owns the daily calorie target** — which reverses the direction this
plan originally proposed. The web moves; Expo's source of truth was already right.

## Task 1 — Spec documentation

- [x] `shape.md` — the finding, the class it belongs to, the decision as made, and how the
      three open questions closed
- [x] `standards.md` — which standards apply and the points they carry in
- [x] `references.md` — the full metric-by-metric trace, and what was checked and cleared
- [x] `plan.md` — this file

## Task 2 — `packages/shared/src/domain/targets.ts`

The single definition of what a user's daily targets are, beside `domain/goals.ts`.

- [x] `resolveCalorieTarget(goals)` — the `calories` / `daily` row, or `null`. First match
      wins, because `goals` has no unique constraint on (user, type, period) and both
      clients have always read the oldest row with `.find()`
- [x] `resolveWorkoutTarget(goals)`, `findGoalTarget(goals, type, period)`
- [x] `resolveMacroTargets(profile)` — grams from the profile, each one the stored value or
      `null`. Structurally typed (`{ macroCarbs?, macroFat?, macroProtein? }`); the shared
      package does not import a client's API types
- [x] `resolveDailyTargets(goals, profile)` — the two stores, one object
- [x] `caloriesFromMacros` — `carbs*4 + fat*9 + protein*4`, and `null` unless all three
      grams are set. It is a **hint** for the target editor now, not a fallback
- [x] `targetFraction` / `remainingToTarget` — `null` when there is no target, so a caller
      cannot accidentally render "no goal" as "0% of your goal"
- [x] `SUGGESTED_MACRO_TARGETS` — the web's old silent defaults, surviving only as the seed
      for the editor's input fields, where the user sees them before saving
- [x] `domain/index.ts` re-exports it; `__tests__/targets.test.ts` covers all of the above

## Task 3 — The web reads the goals table

- [x] `hooks/useDailyTargets.ts` replaces `hooks/useMacroGoals.ts`. Composes `useProfile`
      and `useGoals`, exposes `{ targets, targetsLoading, saveDailyTargets }`
- [x] `saveDailyTargets` writes macro grams to the profile and the calorie target to the
      goals row it read — update if present, create if absent, delete if cleared
- [x] `components/home/DailyTargetsModal.tsx` replaces `MacroGoalModal.tsx`: calories is a
      real field, the derived kcal is a hint with a "Use as target" button
- [x] `pages/Home.tsx` — ring target, macro rows and the pencil affordance all read
      `targets`; unset renders as unset and the control reads "Set targets"
- [x] `pages/Energy.tsx` — same hook, so the two calorie rings cannot disagree
- [x] `components/home/MacroCircles.tsx` — `goal: number | null`
- [x] `pages/Home.test.tsx` / `pages/Energy.test.tsx` — both pinned `2400`, the invented
      number. They now pin the target coming from the goals row, and the unset state

## Task 4 — Expo gets a profile client and hook

- [x] `mobile/src/core/api/health.ts` — profile slice only (`get` + `upsert`), transcribed
      from the web. Weight, water, cycle and streak clients stay out of scope
- [x] `mobile/src/lib/queryKeys.ts` — `profile: ['profile']`, matching the web's key
- [x] `mobile/src/hooks/useProfile.ts` — explicit `staleTime`, `setQueryData` on upsert,
      error as a display string, and the web's unloaded-profile fallback exported as
      `UNLOADED_PROFILE` so the two cannot drift silently

## Task 5 — Expo's Home stops inventing targets

- [x] `|| 2000` and `|| 4` deleted. `buildHomeProgress` is exported pure wiring, tested
      render-free per the `goalsWithCurrent` precedent
- [x] Hero prints the goals-row target, or the meal count plus a "Set a daily calorie
      target" button and no progress bar when there is none
- [x] Protein gains its target; Carbs and Fat gain cards and targets, from profile grams
- [x] "Calories left" reads `--` without a target instead of counting down from 2000

## Task 6 — Sleep: both clients show last night

- [x] Expo's weekly average replaced by today's check-in hours, meta "last night". `--`
      stays the empty rendering (a `MetricCard` needs a value); the web keeps hiding its
      quick-tile pill, which is the same number rendered as a log-button affordance

## Task 7 — `staleTime` hygiene on the Expo hooks touched here

- [x] `mobile/src/hooks/useEnergy.ts` — both queries, 2 min, matching the web
- [x] `mobile/src/hooks/useWorkouts.ts` — same
- [ ] `mobile/src/hooks/useGoals.ts` — left at 5 min. It is explicit, it changes no
      displayed number, and the goals card is another branch's territory this week

## Verification

- [x] `cd frontend && npx tsc --noEmit`
- [x] `cd mobile && npx tsc --noEmit`
- [x] `cd packages/shared && npx vitest run`
- [x] `cd frontend && npx vitest --run`
- [x] `cd mobile && npm test`
- [ ] Visual pass on a simulator or browser — **not done**, both were in use

## Deliberately not done

- **No backend change and no response-shape change.** `GET /api/goals` and
  `GET /api/profile` already carry everything both clients read. The MCP server is
  untouched.
- **The Goals page and `GoalModal` are unchanged.** They already wrote the row that now
  wins; another branch owns those screens this week.
- **The web does not gain a "Workouts this week" tile.** Q3 — adding a metric to the
  reference client needs sign-off.
- **Expo does not gain water, weight, streak or cycle clients.** That is the sibling PR
  (`2026-09-14-1122-parity-home-surface`).
- **Expo cannot yet edit macro targets** — it has no profile-editing screen, and adding
  one belongs with Settings. It renders the grams the web sets, and honest blanks until
  then.
