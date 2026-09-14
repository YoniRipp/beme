# Plan — Goals Parity: Card, Form and Failure States

Status: **proposed, not started.** This is a task write-up from a parity audit; no
application code has changed. Read `shape.md` first — in particular the "What already
matches" section, which rules several suspected gaps out.

**Goal:** Expo's Goals surface behaves like the web's, with the two correctness bugs fixed
first.

**Scope:** `mobile/` and `packages/shared` only. `frontend/` changes in exactly one way — an
import path, when `formatGoalValue` moves to the shared package. No backend change, no API
change.

**Sizing:** Tasks 1–2 are half a day together. Tasks 3–6 are a day. Task 7 is an hour.

## Global constraints

- CLAUDE.md rule 1: never break existing functionality. Rule 4: don't change API shapes.
- `mobile/`'s Jest suites and `frontend/`'s Vitest suites must be green after every task.
- No inline hex in `mobile/` — `src/theme/__tests__` has AST guards that fail the build.
- Every task ends green and committed, and can be reverted on its own.

## File map

| File | Change |
|---|---|
| `mobile/src/screens/GoalsScreen.tsx` | surface `goalsError`; pass `percentage` to the card |
| `mobile/src/screens/GoalFormScreen.tsx` | re-sync form state when the goal resolves; web's defaults + type→period coupling |
| `mobile/src/components/shared/MobileGoalCard.tsx` | shared value formatting, percentage text, achieved state, ring |
| `mobile/src/components/shared/ProgressRing.tsx` | themed track colour instead of `#e5e7eb` |
| `mobile/src/hooks/useGoals.ts`, `useEnergy.ts`, `useWorkouts.ts` | explicit `staleTime`, matching the web |
| `packages/shared/src/domain/goals.ts` | `formatGoalValue`, `GOAL_UNIT_LABELS`, `defaultPeriodForType` |
| `frontend/src/components/goals/GoalCard.tsx` | import the formatter from shared; behaviour unchanged |
| `frontend/src/components/goals/GoalModal.tsx` | use `defaultPeriodForType` instead of the inline ternary |

---

### Task 1 — A failed goals fetch says so

- [ ] `GoalsScreen` destructures `goalsError` from `useGoals` (it is already returned) and
      renders it above the list, in the position the web's `ContentWithLoading` uses.
- [ ] The empty state renders only when the fetch **succeeded** and returned nothing. An error
      must never render "No goals yet".
- [ ] Test: a screen-level test asserting error copy renders and the empty state does not.
      If mounting the screen drags in React Query (a `QueryClient` in a Jest run leaves a
      `notifyManager` batch timer that hangs the suite — see the note in
      `mobile/src/hooks/useWorkouts.ts`), extract the branch as a pure `goalsViewState()`
      helper and pin that instead, the way `goalsWithCurrent` was extracted.

### Task 2 — Editing a goal that hasn't loaded yet

- [ ] Add the effect `GoalModal` has and `GoalFormScreen` lacks: when `existingGoal` changes
      from `undefined` to a goal, reset `type`, `target` and `period` from it.
- [ ] Don't clobber typing: only re-seed when the identity of the goal changes, not on every
      render. Key the effect on `existingGoal?.id`.
- [ ] Test: seed the form with no goal in cache, resolve the goal, assert the fields hold the
      goal's values and not the create defaults.

### Task 3 — One value formatter for both clients

- [ ] Move `formatGoalValue` and the unit labels out of
      `frontend/src/components/goals/GoalCard.tsx` into `packages/shared/src/domain/goals.ts`,
      beside `computeGoalProgress`. Verbatim: sleep as `${value.toFixed(1)}h`, everything else
      `toLocaleString()`.
- [ ] Export `GOAL_UNIT_LABELS = { calories: 'calories', workouts: 'workouts', sleep: 'hours avg' }`
      — the web's strings, per shape.md's open question 1.
- [ ] `GoalCard.tsx` imports both; its rendered output must not change (its Vitest suite is the
      check).
- [ ] `MobileGoalCard` uses both, replacing `current.toLocaleString()` and the `unit` field of
      its local `typeMeta` map. `typeMeta` keeps the icon and colours.
- [ ] Unit tests in `packages/shared/src/domain/__tests__/goals.test.ts`: 7.333… → `7.3h`,
      1850 → `1,850`, and each unit label.

### Task 4 — The card reads like the web's

- [ ] `GoalsScreen` passes `percentage` from `computeGoalProgress` alongside `current`;
      `MobileGoalCard` stops recomputing `current / goal.target` locally. One calculator.
- [ ] Add `{n}% complete` under the value line, matching the web's wording and rounding
      (`toFixed(0)`).
- [ ] Give the progress element an accessible name and value — the web has both a visible
      percentage and an `sr-only` sentence; Expo's `ProgressBar` currently has neither.
- [ ] Achieved state at ≥100%: the web tints the card border with success. Use the theme's
      success token.
- [ ] Swap the icon tile + linear bar for `ProgressRing` with the type glyph centred, matching
      the web — **only if** open question 2 comes back "ring". If it comes back "bar", keep the
      bar and do the rest of this task anyway.
- [ ] While adopting `ProgressRing`: replace its hard-coded `stroke="#e5e7eb"` with the theme's
      muted surface. It is the one colour change in this spec and it is a rule violation, not
      taste.

### Task 5 — Same defaults, same coupling

- [ ] `defaultPeriodForType(type)` in `packages/shared/src/domain/goals.ts`: `calories` and
      `sleep` → `daily`, otherwise `weekly`. Pure, three lines, two tests.
- [ ] `GoalFormScreen` new-goal defaults become type `calories`, period `daily` — the web's.
- [ ] Changing the type on a **new** goal moves the period to `defaultPeriodForType(type)`.
      Editing an existing goal leaves the period alone, which is what the web's
      `!goal && …` guard does.
- [ ] `GoalModal` calls the shared helper instead of its inline ternary. Behaviour identical.

### Task 6 — Copy and feedback

- [ ] Empty state adopts the web's three strings: "Add your first goal" / "Set a target for
      workouts, calories, or sleep to stay on track." / "Add a goal".
- [ ] Toast "Goal deleted" on a successful delete, matching the web. Keep the failure toast.
- [ ] Delete confirmation gains the web's second sentence, "This action cannot be undone."
- [ ] "Add another goal": a dashed, low-emphasis control below the list rather than a filled
      primary button, matching `AddAnotherCard`'s intent within Paper's vocabulary.
- [ ] Screen header: the web's kicker/title/subtitle is "Goals" / "Stay on target" / "Set
      targets that guide your week." Expo's `MobileScreen` has title + subtitle. Use
      "Stay on target" as the title, since the navigator header already says "Goals" —
      which also stops the word appearing twice on the same screen.

### Task 7 — Explicit, matching `staleTime`

- [ ] `useGoals` 5 min → 2 min, matching the web.
- [ ] `useEnergy` and `useWorkouts` get an explicit `staleTime: 2 * 60 * 1000` instead of
      inheriting the 60s client default. `frontend/data-fetching`: always explicit.
- [ ] No behaviour change beyond freshness; the queries themselves stay as they are.

## Verification

- [ ] `cd mobile && npx tsc --noEmit`
- [ ] `cd mobile && npm test`
- [ ] `cd frontend && npx tsc --noEmit`
- [ ] `cd frontend && npx vitest run` — `GoalCard.test.tsx` must pass **unchanged**; it is the
      proof that moving the formatter changed nothing on the live client
- [ ] `npx vitest run` in `packages/shared` for the new domain tests
- [ ] Manual, on a simulator: a goal of each type at 0%, mid, and ≥100%; the error state with
      the API stopped; editing a goal from a cold start

## Deliberately not in scope

- **The shared calculator.** Both clients already use it; nothing to do. Recorded in shape.md
  so the next audit doesn't re-open it.
- **The duplicated screen title** across Expo's tabs (navigator header + `MobileScreen` title).
  Systemic, belongs to the shell owner. Task 6 stops Goals doing it, as a side effect of using
  the web's title, and doesn't touch the other four screens.
- **Expo's Paper palette.** Owned by the design-system pass. The one colour touched here is
  `ProgressRing`'s hard-coded track, and only because this spec adopts that component.
- **Voice-created goals.** The web can add a goal by voice (`add_goal` in the voice executor);
  Expo has no voice stack at all. That is the voice sub-project, not Goals.
