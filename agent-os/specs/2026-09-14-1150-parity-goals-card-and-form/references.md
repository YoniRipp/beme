# Reference Implementations Studied

Read before writing any of the above. Line references are to `origin/main` at 2026-09-14.

## The reference client (web)

- `frontend/src/pages/Goals.tsx` — list, empty state, modal wiring; `ContentWithLoading`
  receives `error={goalsError}`, which is the behaviour Expo is missing
- `frontend/src/components/goals/GoalCard.tsx` — `GOAL_ICON_STYLES`, `GOAL_LABELS`,
  `formatGoalValue`, the 64px ring, `{n}% complete`, the `sr-only` sentence, the achieved
  border
- `frontend/src/components/goals/GoalModal.tsx` — the `useEffect` on `[goal, open]` that
  Task 2 ports, and the inline type→period ternary that Task 5 moves to shared
- `frontend/src/components/shared/EmptyState.tsx`, `AddAnotherCard.tsx`,
  `ContentWithLoading.tsx` — the copy and affordances Task 6 matches
- `frontend/src/hooks/useGoals.ts` — the hook Expo's is a near-copy of; the two differ only in
  `staleTime` and one error string

## The conforming client (Expo)

- `mobile/src/screens/GoalsScreen.tsx` — `goalsWithCurrent`, and the destructure that drops
  `goalsError`
- `mobile/src/screens/GoalFormScreen.tsx` — mount-time `useState` seeding, defaults
  `workouts`/`weekly`
- `mobile/src/components/shared/MobileGoalCard.tsx` — `typeMeta` units, the local
  `current / goal.target`, the linear `ProgressBar`
- `mobile/src/components/shared/ProgressRing.tsx` — already exists, already SVG, one
  hard-coded colour
- `mobile/src/hooks/useGoals.ts` — the 5-minute `staleTime`
- `mobile/src/screens/__tests__/GoalsScreen.progress.test.ts` — the extract-a-pure-function
  pattern the new tests follow, and the reason for it (React Query timers hang Jest)

## Shared

- `packages/shared/src/domain/goals.ts` — `computeGoalProgress`, `buildGoalCurrentCalcs`; the
  header comment records that mobile's cards used to show `0 / target` for everything
- `packages/shared/src/domain/dates.ts` — `getPeriodRange`, `WEEK_SUNDAY`
- `packages/shared/src/types/goals.ts` — the one definition of `GoalType` / `GoalPeriod`, which
  both clients re-export

## Backend (read to confirm no API work is needed)

- `backend/src/routes/goal.ts`, `controllers/goal.ts`, `services/goal.ts` — list is paginated
  and validated; nothing here changes
- `backend/src/schemas/routeSchemas.ts:17-18` — `goalType` / `goalPeriod`, identical to the
  shared constants
- `backend/mcp-server/tools/goals.js` — the same two enums again, third consumer

## Prior specs leaned on

- `agent-os/specs/2026-09-12-1230-mobile-foundation/shape.md` — why `packages/shared` exists
  and what is allowed to cross into it
