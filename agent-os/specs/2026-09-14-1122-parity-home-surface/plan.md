# Plan — Home Parity: The Missing Half of the Dashboard

Status: **not started.** This spec is the task write-up; no application code has changed.

Tasks 3–8 are independently shippable and ordered by user value. Task 2 unblocks all of them.

## Task 1 — Spec documentation

- [x] `shape.md` — section-by-section comparison, decisions, open questions
- [x] `standards.md` — which standards apply and the points they carry in
- [x] `references.md` — every file read, and what turned out to already match
- [x] `plan.md` — this file

## Task 2 — Expo gets the health API surface (unblocks everything below)

Transcribe `frontend/src/core/api/health.ts` into `mobile/src/core/api/health.ts`. The profile
slice is claimed by the sibling spec (`2026-09-14-1120-parity-home-daily-targets`, Task 4) —
whichever lands first adds the file, the other extends it.

- [ ] `weightApi` — **with** the `startDate` / `endDate` window used from the start; see Task 9
- [ ] `waterApi` — `getToday`, `addGlass`, `removeGlass`, `upsert`
- [ ] `streakApi.list()`
- [ ] `cycleApi` — `list(startDate?, endDate?)`, `add`
- [ ] `mobile/src/lib/queryKeys.ts` gains `weightEntries`, `waterToday(date)`, `waterTodayAll`,
      `cycleEntries`, `streaks`, matching `frontend/src/lib/queryClient.ts:25-38` key for key
- [ ] `mobile/src/core/api/__tests__/health.test.ts` — same wiring coverage the existing
      `food.test.ts` / `workouts.test.ts` give

## Task 3 — Water on Expo

The daily loop, and the cheapest read in the app (one row, keyed by date).

- [ ] `mobile/src/hooks/useWater.ts` mirroring `frontend/src/hooks/useWater.ts`: 30 s
      `staleTime`, `setQueryData` on every mutation, and the `latestSetRef` out-of-order guard
      (`useWater.ts:49,66,73`) — that guard exists because taps outrun responses on the
      most-tapped control in the app, and it is more relevant on a phone, not less
- [ ] `ML_PER_GLASS = 250`, matching the backend's own conversion
- [ ] Water card on Home: glasses/goal, ml total, −/+ controls, progress bar. Goal from
      `profile.waterGoalGlasses` (Task 2's profile slice).
- [ ] Touch targets ≥ 44 px on both controls (`frontend/mobile-ui`)

## Task 4 — Weight on Expo

Already a web quick-log action, so it also closes half of Task 7.

- [ ] `mobile/src/hooks/useWeight.ts` — **date-windowed**, unlike the web's (Task 9)
- [ ] Weight card: latest reading, delta to `profile.targetWeight`, kg/wk trend, 7-bar
      sparkline, and the "No weight logged yet" empty state with its CTA
- [ ] A weight log form — a stack screen (`WeightForm`, `presentation: 'modal'`) alongside
      `SleepForm`, matching how Expo already does modals rather than porting the web's `Dialog`

## Task 5 — Streaks on Expo

- [ ] `mobile/src/hooks/useStreaks.ts` — one `GET /api/streaks`, 5 min `staleTime`, the same
      `workoutStreak` / `foodStreak` / `waterStreak` accessors
- [ ] Streak card: three tiles, current count, personal-best trophy, best-count fallback
- [ ] Renders `null` when every streak is 0 — same as `StreakCard.tsx:22`, so a new user does
      not get an empty shell

## Task 6 — Recent activity on Expo

- [ ] Merge `foodEntries.slice(0, 10)` and `workouts.slice(0, 10)`, sort by date, take 5 —
      the logic at `Home.tsx:88-106`, from data both Expo hooks already hold. No new endpoint.
- [ ] Rows navigate to the Energy / Body tabs, matching the web's `/energy` and `/body`
- [ ] Consider extracting the merge into `packages/shared/src/domain/` if it survives review —
      it is pure and both clients want it (the `domain/goals.ts` precedent)

## Task 7 — Quick log becomes a 2×2 grid

- [ ] Replace the three stacked `Button`s (`HomeScreen.tsx:188-198`) with a 2×2 tile grid:
      Log food · Log workout · Log sleep · Log weight
- [ ] A `QuickTile` equivalent under `mobile/src/components/shared/`, built on Paper + the
      theme hooks — icon, label, and an optional pill
- [ ] Pills carry today's logged value (`7.5h`, `82kg`) so the action stays reachable after
      use, which is the reason the web's comment gives at `Home.tsx:248-249`

## Task 8 — Hero card and loading

- [ ] Wire `mobile/src/components/shared/ProgressRing.tsx` into the fuel card. It already
      exists, is theme-safe and is imported by nothing today.
- [ ] Add the protein / carb / fat bars beside the ring (targets come from the sibling spec's
      `resolveMacroTargets`)
- [ ] Drop the whole-screen `if (loading) return <LoadingView />` at `HomeScreen.tsx:133`:
      the header renders immediately, the fuel card waits on `energyLoading` only, and each
      card owns its skeleton. This is the web's layering (`Home.tsx:173-174`), currently
      inverted on Expo.
- [ ] An edit-macros affordance to match the web's pencil, or a documented reason not to

## Task 9 — Fix the web's unbounded weight read (separate, but do not forget it)

`frontend/src/hooks/useWeight.ts:16` calls `weightApi.list()` with no window;
`backend/src/controllers/weight.ts:15` only paginates when the client asks. The web therefore
reads a user's **entire** weight history on every Home render to draw seven bars. Critical
rule 6.

- [ ] Pass a date window (or `{ limit }`) from `useWeight`
- [ ] Check `useCycle` for the same shape before assuming it is fine
- [ ] Expo's new hook uses the window from day one either way — this task is about not leaving
      the reference client worse than the port

## Verification

- [ ] `cd mobile && npx tsc --noEmit`
- [ ] `cd frontend && npx tsc --noEmit`
- [ ] `cd backend && npx tsc --noEmit` — expected untouched, run anyway
- [ ] `cd mobile && npm test` — including the theme guard, which fails on any inline hex
- [ ] `cd frontend && npx vitest run`
- [ ] One account, both clients side by side, per task: the same water count, the same latest
      weight, the same streaks, the same five recent items
- [ ] **Needs a device, cannot be verified from code:** the safe-area result of hiding Expo's
      native header on Home (Q2), and whether a 2×2 tile grid plus five cards leaves Home
      comfortably scrollable at ~390 px

## Deliberately not done

- **No web card is removed.** The web is the reference; it does not shrink to meet Expo.
- **The "Set your first goal" prompt is not added to the web** (Q4) — the Goals page already
  carries that empty state.
- **The setup wizard is not ported here** (Q3). It is large enough to be its own spec, and
  four of the cards above depend on the profile fields it collects, so it should be shaped
  properly rather than tacked on.
- **The greeting is not changed on either side** (Q1) — the recommendation touches the
  reference client and needs sign-off.
- **Voice is not addressed.** `mobile/src` has zero voice/mic/speech references while
  `CLAUDE.md` calls voice the primary input method; that is a navigation-shell gap and belongs
  to whoever owns nav, not to Home.
- **The Paper purple theme leak is untouched** — another agent owns the design system, and
  nothing here depends on how it resolves.
</content>
