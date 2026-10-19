# Plan — Parity: the Journal screen

Status: **not started.** This is an audit write-up; no application code has been changed.

Ordered by user-visible severity. Task 2 is the one that makes the two clients report the
same number for the same data, and should not be deferred behind the layout work.

## Task 1 — Save spec documentation

- [x] `shape.md` — what diverged, what already matches, open questions
- [x] `standards.md` — which standards apply and the points carried into the work
- [x] `references.md` — the code read on both sides before writing any of this
- [x] `plan.md` — this file

## Task 2 — Period totals: average, don't sum

Files: `mobile/src/screens/EnergyScreen.tsx`, `mobile/src/components/shared/PeriodSelector.tsx`

- [ ] Extract the web's rule into `packages/shared/src/domain/` as
      `periodNutritionTotals(entries, period)`: sum for `daily`; for the other three, sum
      and divide by the count of **distinct `date` day strings** (not distinct `Date`
      objects — `Energy.tsx:216-218` calls that trap out by name), returning the sum
      unchanged when that count is `<= 1`. Port `Energy.tsx:205-226` verbatim; do not
      re-derive it.
- [ ] Point the web's `periodTotals` at the new helper in the same change, so the shared
      copy has one caller that already ships and cannot drift on day one.
- [ ] Use it in `EnergyScreen`. Label the value the way the web does: `daily` reads
      `1,850`, the rest read `1,850` with a `/ day` qualifier — never a bare 7-day sum.
- [ ] Give `PeriodSelector` an optional `summaries?: Record<Period, string>` and render
      label-over-summary, matching the web's two-line chip. Keep the prop optional:
      `BodyScreen` and `GoalsScreen` use the same component and are out of scope.
- [ ] Tests (`mobile/src/screens/__tests__/`, alongside the existing
      `FoodEntryFormScreen.portion.test.ts`): weekly across 3 days averages, a single day
      does not, and an empty range is `0`. Mirror them in
      `packages/shared/src/domain/__tests__/`.

## Task 3 — Calorie and macro rings

Files: new `mobile/src/core/api/profile.ts`, new `mobile/src/hooks/useProfile.ts`,
new `mobile/src/hooks/useMacroGoals.ts`, `mobile/src/screens/EnergyScreen.tsx`,
`mobile/src/lib/queryKeys.ts`

- [ ] `core/api/profile.ts` — `get()` / `upsert()` against `GET|PUT /api/profile` through
      the existing `request` wrapper. **Endpoint exists**; no backend work.
- [ ] `useProfile` with an explicit `staleTime` (the web uses `5 * 60 * 1000`) and a
      `queryKeys.profile` entry; mutation writes the cache with `setQueryData`.
- [ ] `useMacroGoals` ported from `frontend/src/hooks/useMacroGoals.ts` — same defaults
      (`carbs 300 / fat 80 / protein 120`) and the same
      `carbs*4 + fat*9 + protein*4` calorie target. This is a pure function of the profile
      and should land in `packages/shared/src/domain/` with both clients importing it.
- [ ] Render the calorie ring with the existing `components/shared/ProgressRing`, and three
      macro rings beside it. Values come from Task 2's totals, so the ring reads `/ day`
      on non-daily periods exactly as the web's does.
- [ ] Editing the targets: the web opens `MacroGoalModal` from the macro block. Expo gets
      the equivalent as a Paper `Dialog`. If that is deferred, the rings still render —
      note it in the PR rather than shipping a ring with a hidden hard-coded target.

## Task 4 — Grouped history for weekly / monthly / yearly

Files: `mobile/src/screens/EnergyScreen.tsx`, new
`mobile/src/components/energy/CollapsibleFoodGroup.tsx`

- [ ] Port `groupFoodEntries` (`Energy.tsx:35-85`) — by day for `weekly`, by Sunday-week for
      `monthly`, by month for `yearly`, keys sorted descending. It is pure and belongs in
      `packages/shared/src/domain/` next to Task 2's helper, with the web switched over.
- [ ] A collapsible group header: label, `N items`, `- N days` when averaging, and the
      calorie rollup (`N cal` weekly, `N cal/day` monthly and yearly). First group open,
      the rest closed — same as `defaultOpen={i === 0}`.
- [ ] Keep the flat list for `daily`; only the non-daily branch changes.
- [ ] Empty state stays `EmptyState` with a "Log Food" action, as today.

## Task 5 — Sleep back on the same scroll

Files: `mobile/src/screens/EnergyScreen.tsx`

- [ ] Drop the Food/Sleep `SegmentedButtons`; render sleep as a card below the journal.
- [ ] Give sleep its own `sleepPeriod` state and its own `PeriodSelector`, independent of
      the food period — this is the point of the change, not a detail of it.
- [ ] The sleep log list stops being period-filtered: show check-ins from the start of last
      week onward, newest first (`Energy.tsx:261-267`).
- [ ] Keep Expo's `sleepHours != null` filter for now and leave a comment pointing at open
      question 1. Do **not** copy the web's denominator bug in the name of parity.

## Task 6 — The small ones

- [ ] **Sort inside a meal.** Port the web's comparator (`Energy.tsx:176-190`): entries with
      a time first, ascending by `startTime ?? endTime`, then the rest.
- [ ] **Food photos.** Move `frontend/src/hooks/useFoodImages.ts`'s keyword map into
      `packages/shared` and use it in `MobileFoodCard` behind an `Image` with an
      icon fallback — the same degrade-to-icon rule `ImagePlaceholder` follows, since these
      are remote URLs.
- [ ] **In-screen title.** "Food log" / "Journal", matching the web's page header and
      section heading. Leave the tab label alone.
- [ ] **`RootStackParamList`.** `FoodEntryForm: { entryId?: string; mealType?: MealType } | undefined`,
      and drop the `useRoute<any>()` in `FoodEntryFormScreen` so the type is enforced.
- [ ] **`staleTime` on the energy queries.** `mobile/src/lib/queryClient.ts` defaults to
      60s; the web sets `2 * 60 * 1000` explicitly on both energy queries.
      `frontend/data-fetching` says always set it explicitly — do that, and match the web.

## Verification

- [ ] `mobile: npx tsc --noEmit`
- [ ] `mobile: npm test` — including the new period-total and grouping tests
- [ ] `packages/shared: npx vitest run`
- [ ] `frontend: npx tsc --noEmit` and `npx vitest run` — Tasks 2, 3 and 4 each move a
      function into `packages/shared` and repoint the web at it; the web must stay green
- [ ] Side-by-side read of the same account on both clients: Daily / Weekly / Monthly /
      Yearly show the same calorie figure, and the ring shows the same target
- [ ] Both themes on a device (the AST palette guards catch frozen hexes, not contrast)

## Deliberately not in this spec

- **Voice, barcode, meal tools, copy day, "Log again"** — `2026-09-14-1132-parity-food-entry-points`.
- **Water** — `2026-09-14-1134-parity-water-screen`.
- **The Home screen's calorie-goal source** — owned elsewhere; this spec does not touch
  `HomeScreen.tsx`.
- **Tab labels and tab set** (`Energy` vs `Food`, six tabs vs four) — navigation parity.
- **The Paper purple theme leak** — design-system workstream.
- **Fixing the web's sleep-average denominator** — open question 1; a change to the
  shipping client's numbers deserves its own decision.
