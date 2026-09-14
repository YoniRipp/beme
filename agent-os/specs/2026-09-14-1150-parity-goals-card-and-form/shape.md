# Goals Parity: Card, Form and Failure States — Shaping Notes

## Why this exists

`frontend/` (web + PWA) and `mobile/` (Expo) are meant to be the same app on a phone. This
spec covers the Goals surface: `frontend/src/pages/Goals.tsx` +
`frontend/src/components/goals/` against `mobile/src/screens/GoalsScreen.tsx` +
`mobile/src/screens/GoalFormScreen.tsx` + `mobile/src/components/shared/MobileGoalCard.tsx`.

**The web client is the reference.** It ships to users today; Expo conforms to it. Where
Expo's approach looks better, this spec records it as an open question rather than deciding.

## What already matches — do not "fix" it

Verified against both codebases, because the cheapest parity work is the work you don't do:

- **One goal-progress calculator, and both clients call it.** `computeGoalProgress` lives in
  `packages/shared/src/domain/goals.ts`. The web reaches it through
  `frontend/src/features/goals/useGoalProgress.ts`; Expo through `goalsWithCurrent` in
  `GoalsScreen.tsx`. Those are the only two call sites in the repo. There is no second
  implementation of the maths.
- **The vocabulary agrees end to end.** `GOAL_TYPES = ['calories','workouts','sleep']` and
  `GOAL_PERIODS = ['daily','weekly','monthly','yearly']` in
  `packages/shared/src/types/goals.ts`; both forms render every member by mapping the shared
  constant; `backend/src/schemas/routeSchemas.ts` declares the identical Zod enums; the MCP
  server's goal tools declare the same. **There is no goal type or period one client can
  write that the other cannot display.** That was the expected data-visibility bug and it
  isn't there.
- **The same data window feeds the calculation.** Both clients read food entries and
  check-ins through `requestAllPages` (the shared pager in `packages/shared/src/api`), so a
  monthly calories goal sums the same rows on both. A single-page read on one side would
  have made the two screens disagree about the same goal without either being "wrong".
- **Week is Sunday–Saturday on both**, via `WEEK_SUNDAY` in `packages/shared/src/domain/dates.ts`,
  as `global/domain-conventions` requires.
- Card anatomy broadly agrees: period eyebrow, "<type> goal" title, current / target, an edit
  and a delete control, delete behind a confirmation dialog.

## The gaps

Grouped by how much they can hurt a user.

### 1. A failed goals fetch looks like "you have no goals"

`GoalsScreen` destructures `{ goals, goalsLoading, deleteGoal }` and never reads `goalsError`,
which `useGoals` already returns. When `GET /api/goals` fails, `goalsLoading` is false and
`goals` is `[]`, so the screen renders the first-run empty state — "No goals yet / Set your
first wellness goal / Add Goal". The user is told their goals are gone and invited to recreate
them. The web renders the error above the list through `ContentWithLoading`'s `error` prop.

This is the only gap here that can cause a user to act on false information, so it leads.

### 2. Editing a goal before its list has loaded rewrites it

`GoalFormScreen` computes `existingGoal` from `getGoalById(goalId)` and seeds `useState` from
it — **once**, at mount. If the goals query has not resolved yet (cold start into a restored
navigation state, or a cache that was dropped), the form initialises to the *create* defaults:
type `workouts`, period `weekly`, empty target. `existingGoal` resolving a moment later
updates only the screen title, via the one `useEffect` present. Fill in a target, press
"Update Goal", and the PATCH sends `type: 'workouts', period: 'weekly'` — a calories goal has
silently become a workouts goal.

The web's `GoalModal` re-syncs on `[goal, open]`, which is exactly the effect Expo is missing.

### 3. Sleep progress is unreadable, and the units disagree

`computeGoalProgress` returns an *average* for a sleep goal, so `current` is routinely
`7.333333333333333`. The web formats it: `formatGoalValue` gives `7.3h / 8.0h hours avg`.
`MobileGoalCard` prints `current.toLocaleString()`, which renders **`7.333 / 8 hours`**.

The unit nouns differ too — calories read `calories` on web and `kcal` on Expo. The web Goals
card is the reference here, so `calories` wins, but note the web is not internally consistent:
`frontend/standards`' own card anatomy uses `kcal` for food cards. Flagged as an open question
rather than settled by this spec.

### 4. The progress affordance is a different visual language

Web: a 64px SVG ring around the type glyph, plus `{n}% complete` in text and an `sr-only`
sentence for screen readers, plus a success-tinted border once the goal is achieved.
Expo: a 54px rounded icon tile beside a linear `ProgressBar`, no percentage text, no achieved
state, and no accessible value on the bar.

Expo already has `mobile/src/components/shared/ProgressRing.tsx`, so this is assembly, not
invention. One catch: that component hard-codes its track colour (`stroke="#e5e7eb"`), which
`mobile/CLAUDE.md` forbids — it has to take the theme's muted surface when it is adopted here.

### 5. Two clients, two different new-goal defaults

| | Web `GoalModal` | Expo `GoalFormScreen` |
|---|---|---|
| Default type | `calories` | `workouts` |
| Default period | `daily` | `weekly` |
| Period follows type | yes — picking `calories` or `sleep` sets `daily`, anything else `weekly` (new goals only) | no |

Same button, same backend, different row. The web's type→period coupling is the reference:
a daily workouts goal or a monthly calories goal are both legal, but the sensible default
differs per type and the web encodes that.

### 6. Copy, feedback and affordance drift

- Empty state — web: "Add your first goal" / "Set a target for workouts, calories, or sleep to
  stay on track." / "Add a goal". Expo: "No goals yet" / "Set your first wellness goal" /
  "Add Goal".
- Delete — web toasts "Goal deleted" on success; Expo toasts only on failure, so a successful
  delete is silent. Confirmation copy also differs by a sentence ("This action cannot be
  undone.").
- Add-another — web renders a dashed `AddAnotherCard` below the list; Expo renders a filled
  primary `Button`.
- Header — web `PageHeader` carries kicker "Goals", title "Stay on target", subtitle "Set
  targets that guide your week."; Expo's `MobileScreen` has the subtitle and repeats "Goals"
  as the title.

### 7. `staleTime` drift

Web: `queryKeys.goals` at 2 min, workouts and energy at 2 min, all explicit. Expo: goals at
5 min, workouts and energy with **no `staleTime` at all**, falling back to the 60s client
default. `frontend/data-fetching` says always explicit, and mobile's own hooks otherwise
follow that file. The practical effect is that a goal's `current` can be up to five minutes
stale on Expo while the food list beside it is a minute old.

## Decisions

- **Conform Expo to the web, screen by screen, without touching `frontend/`.** Rule 1 is never
  break existing functionality, and the web client is the one with users on it today.
- **Fix the two correctness gaps (1 and 2) first and separately.** They are small, they are
  testable without rendering, and they should not wait behind a visual pass.
- **Reuse, don't re-derive.** `ProgressRing` exists; `useGoals` already returns `goalsError`;
  `computeGoalProgress` already returns `percentage` (Expo currently recomputes
  `current / target` inline in `MobileGoalCard`, which is a second, smaller copy of the same
  arithmetic — it should take `percentage` from the shared calculator instead).
- **Value formatting belongs in `packages/shared`.** The web's `formatGoalValue` and the unit
  labels are pure, tiny, and are precisely the sort of thing that drifts when copied. Moving
  them next to `computeGoalProgress` means the next client gets them free. The web keeps its
  behaviour byte for byte; only the import path changes.

## Open questions — for the owner, not for the implementer

1. **`calories` or `kcal` on the goal card?** The web Goals card says `calories`; the web food
   card says `kcal`. This spec proposes matching the web Goals card (`calories`) on both and
   leaving food cards alone, but the inconsistency is the web's and someone should pick one.
2. **Ring or bar for goal progress on Expo?** The web's ring is the reference and Expo can
   render it today. The linear bar is arguably the better mobile pattern for a goal list —
   it scans faster in a stack of four. Recorded, not decided.
3. **Does the type→period coupling belong in `packages/shared`?** It is product behaviour
   ("a calories goal is usually daily"), currently expressed as an inline ternary inside a web
   component. If Expo copies the ternary, that is a second copy.

## Constraints

- No API change. Every endpoint this needs already exists and is already consumed by both
  clients.
- `mobile/CLAUDE.md`: no inline hex; colours come from `useThemedStyles` / `useAppTheme`, and
  there are AST guards that will fail the build.
- The theme/design-system pass on Expo (the React Native Paper palette) is owned elsewhere.
  This spec touches colour only where it must: `ProgressRing`'s hard-coded track.
- Expo's Goals tab renders "Goals" twice — once as the navigator header, once as the
  `MobileScreen` title. That is systemic across the Expo tabs (Settings does it too; Body's
  header says "Body" over a title of "Workouts") and belongs to whoever owns the shell, not
  here.
