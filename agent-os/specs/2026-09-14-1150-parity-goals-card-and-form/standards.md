# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `global/domain-conventions` | Goal periods are the date vocabulary; week is Sunday–Saturday; sleep is hours, calories are kcal-derived |
| `global/critical-rules` | Never break the web client; the Goals screen ships to users today |
| `global/testing` | New pure helpers get unit tests; `GoalCard.test.tsx` must pass unchanged |
| `frontend/data-fetching` | `staleTime` always explicit; hooks expose errors as display strings, which is the bug in Task 1 |
| `frontend/components` | The formatter moves to `packages/shared`, not into a second component |
| `frontend/design-tokens` | `ProgressRing`'s hard-coded track colour |
| `frontend/mobile-ui` | Card anatomy, 44px touch targets on the edit/delete icon buttons |
| `mobile/CLAUDE.md` | No inline hex; `useThemedStyles`; shared logic goes in `packages/shared`, not copied |

## Key points carried into the work

- **The web client is the reference.** Expo conforms. Where Expo looks better, it goes in
  shape.md's open questions — the implementer does not decide it mid-task.
- **Hooks expose errors as display strings.** `useGoals` already returns `goalsError` as a
  string on both clients. Expo's screen ignoring it is the whole of Task 1; the plumbing is
  already there.
- **`staleTime` is always explicit.** Two of Expo's three Goals-relevant queries currently
  inherit the client default. The standard is explicit per query, and the web is.
- **Logic the other client also needs goes in `packages/shared`.** `formatGoalValue` and
  `defaultPeriodForType` are pure product rules. Copying them into `MobileGoalCard` is how the
  two screens end up disagreeing — which is exactly what already happened to the sleep value,
  where Expo prints `7.333` and the web prints `7.3h`.
- **Never inline a hex colour in `mobile/`.** There are AST guards in `src/theme/__tests__`.
  `ProgressRing` predates them and is caught here only because this spec adopts it.
- **Dates are local-calendar `YYYY-MM-DD`,** and period ranges come from
  `getPeriodRange` in `packages/shared/src/domain/dates.ts`. Nothing in this spec computes a
  range itself.
- **Per-user data stays bounded.** No new reads: the Goals screen already holds the food,
  workout and check-in data it needs, through the shared bounded pager.
