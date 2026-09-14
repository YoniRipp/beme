# Plan — Home Parity: One Set of Daily Targets

Status: **not started.** This spec is the task write-up; no application code has changed.

## Task 1 — Spec documentation

- [x] `shape.md` — the finding, the class it belongs to, decisions, open questions
- [x] `standards.md` — which standards apply and the points they carry in
- [x] `references.md` — the full metric-by-metric trace, and what was checked and cleared
- [x] `plan.md` — this file

## Task 2 — `packages/shared/src/domain/targets.ts`

The single definition of what a user's daily targets are, placed next to `domain/goals.ts`
for the same reasons that module gives: pure, React- and DOM-free, unit-testable without
rendering, callable from a hook or straight from a screen.

- [ ] `DEFAULT_MACRO_TARGETS = { carbs: 300, fat: 80, protein: 120 }` — the web's current
      defaults, moved verbatim from `frontend/src/hooks/useMacroGoals.ts:10` so no user's
      number changes on the reference client
- [ ] `caloriesFromMacros({ carbs, fat, protein })` — `carbs*4 + fat*9 + protein*4`, moved
      verbatim from `useMacroGoals.ts:30`
- [ ] `resolveMacroTargets(profile)` → `{ carbs, fat, protein, calories }`, each macro
      `profile.macroX ?? DEFAULT_MACRO_TARGETS.x`
- [ ] Accept a structurally-typed profile (`{ macroCarbs?, macroFat?, macroProtein? }`), not
      the web's `ApiProfile` — the shared package must not depend on a client's API types
- [ ] `packages/shared/src/domain/index.ts` re-exports it
- [ ] `packages/shared/src/domain/__tests__/targets.test.ts`: defaults resolve to 2400; a
      partially-filled profile only defaults the missing macros; explicit zeros are honoured
      rather than swallowed by `??`

## Task 3 — Web reads the shared module (no visible change)

- [ ] `frontend/src/hooks/useMacroGoals.ts` keeps its signature (`{ macroGoals, setMacroGoals,
      calorieGoal }`) and delegates to `resolveMacroTargets` / `caloriesFromMacros`. Its local
      `DEFAULTS` and the inline `* 4 / * 9 / * 4` come out.
- [ ] `frontend/src/components/home/MacroGoalModal.tsx:89` recomputes the same sum inline for
      its live preview — point it at `caloriesFromMacros` so the preview can never disagree
      with the ring above it
- [ ] `frontend/src/pages/Home.tsx` untouched. This task must be a pure refactor:
      `Home.test.tsx` already pins `calorieGoal: 2400` and must keep passing unedited.

## Task 4 — Expo gets a profile client and hook

- [ ] `mobile/src/core/api/health.ts` — profile slice only: `ApiProfile` and
      `profileApi.get() / .upsert()`, transcribed from `frontend/src/core/api/health.ts:1-25`.
      Weight, water, cycle and streak clients are explicitly **out of scope** (sibling PR).
- [ ] `mobile/src/lib/queryKeys.ts` — add `profile: ['profile'] as const`, matching
      `frontend/src/lib/queryClient.ts:31`
- [ ] `mobile/src/hooks/useProfile.ts` — mirrors `frontend/src/hooks/useProfile.ts`:
      explicit `staleTime: 5 * 60 * 1000`, `setQueryData` on upsert, error surfaced as a
      display string, and the same unloaded-profile fallback object
- [ ] `mobile/src/hooks/__tests__/` — pin that the hook's fallback matches the web's, so the
      two cannot drift apart again silently

## Task 5 — Expo's Home reads the same targets

- [ ] `mobile/src/screens/HomeScreen.tsx:112-113` — delete the `goals.find(calories/daily)`
      lookup and the `|| 2000`; take `calories` from `resolveMacroTargets(profile)`
- [ ] Hero meta reads `of {calories} kcal` from the shared value, so web and Expo print the
      same number for the same account
- [ ] Protein `MetricCard` gains its target (`72 / 120 g`), sourced the same way — today it
      shows a bare gram count with nothing to compare against
- [ ] `progress` memo no longer depends on `goals` for calories; the workouts-per-week target
      keeps reading the `goals` table (that is where it lives — see Q3) but its `|| 4` moves
      to a named exported constant rather than a literal in a `useMemo`
- [ ] `mobile/src/screens/__tests__/HomeScreen.targets.test.ts` — export the pure
      target-resolution wiring from the screen and pin it without rendering, following
      `GoalsScreen.tsx`'s `goalsWithCurrent` precedent (a QueryClient left alive in a jest
      test hangs the run — see the comment at `GoalsScreen.tsx:18-29`)

## Task 6 — Sleep: Expo shows today, like the web

Contested — see **Q2** in `shape.md`. Implement only if the parent/product confirms.

- [ ] `HomeScreen.tsx:115-120` — replace the weekly average with today's check-in hours
- [ ] `--` stays the empty rendering; the web hides its pill entirely when hours are 0, so
      also confirm which empty treatment wins before writing this

## Task 7 — `staleTime` hygiene on the Expo hooks touched here

`frontend/data-fetching`: "Always set `staleTime`. Omitting it makes the app refetch on every
mount." Both clients already default to 60 s globally, so this is drift, not a bug.

- [ ] `mobile/src/hooks/useEnergy.ts` — both queries get `staleTime: 2 * 60 * 1000`, matching
      `frontend/src/hooks/useEnergy.ts:17,29`
- [ ] `mobile/src/hooks/useWorkouts.ts` — same
- [ ] `mobile/src/hooks/useGoals.ts:18` — 5 min → 2 min, matching `frontend/src/hooks/useGoals.ts:18`

## Verification

- [ ] `cd backend && npx tsc --noEmit` — expected untouched, run anyway
- [ ] `cd frontend && npx tsc --noEmit`
- [ ] `cd mobile && npx tsc --noEmit`
- [ ] `cd packages/shared && npx vitest run` — including the new `targets.test.ts`
- [ ] `cd frontend && npx vitest run` — `Home.test.tsx` must pass **unedited**; if it needs a
      change, Task 3 stopped being a refactor
- [ ] `cd mobile && npm test`
- [ ] One account, both clients side by side: the same kcal target, before and after setting
      macros on the web

## Deliberately not done

- **The `goals` table's `calories`/`daily` row is not deleted, migrated, or hidden.** Q1 is a
  product call. Expo stops *reading* it for the Home ring; the row, the Goals page and the
  MCP `goals` tools are untouched.
- **No new endpoint and no response-shape change.** `GET /api/profile` already carries the
  macro fields.
- **Expo does not gain water, weight, streak or cycle clients here.** That is the sibling PR
  (`2026-09-14-1122-parity-home-surface`); mixing them would make this one unreviewable.
- **The web does not gain a "Workouts this week" tile.** Q3 — adding a metric to the
  reference client needs sign-off.
- **The web's `isSameDay` day filter is left alone.** `getPeriodRange('daily')` (which Expo
  uses, from `@trackvibe/shared/domain`) would be the tidier call, but the two produce the
  same set and this PR should not churn the reference client's render path.
</content>
