# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `frontend/data-fetching` | A new Expo `useProfile` query; explicit `staleTime` on every query touched; mutations write the cache |
| `frontend/api-client` | Expo's `core/api/health.ts` is new — no component may `fetch` `/api/profile` directly |
| `frontend/components` | `useMacroGoals` keeps its public shape; the shared module is not a second copy of it |
| `global/domain-conventions` | Dates are local `YYYY-MM-DD`; the week is Sunday–Saturday; nutrition targets are grams, calories are derived |
| `global/testing` | The shared calculator gets unit tests; the Expo screen's wiring gets a render-free test |
| `global/critical-rules` | Changing what number a user sees on the dashboard is a behavioural change, not a refactor |
| `backend/response-format` | Read-only here — confirming `GET /api/profile` already returns the macro fields, so nothing on the wire moves |

## Key points carried into the work

**Data fetching**

- Query keys come from the central `queryKeys` object — `mobile/src/lib/queryKeys.ts`, never
  an inline array. `profile: ['profile']` matches the web's key exactly.
- `staleTime` is always explicit. Expo's `useEnergy` and `useWorkouts` currently omit it and
  silently inherit the 60 s client default while the web sets 2 min; that is drift, and it
  gets fixed in the same pass because these files are already open.
- Mutations write the cache with `setQueryData`, not `invalidateQueries` — Expo's new
  `useProfile.updateProfile` follows `frontend/src/hooks/useProfile.ts:21-23`.
- Hooks expose errors as display strings, not `Error` objects.

**Domain conventions**

- Nutrition targets are stored as **grams** on the profile; kilocalories are always derived
  (`carbs*4 + fat*9 + protein*4`). No client stores or invents a kcal number of its own.
- `foods` is per-100g, `food_entries` is already scaled — the Home totals sum `food_entries`,
  so no conversion enters this work.
- Week is Sunday–Saturday. Expo's `startOfWeek(now, { weekStartsOn: 0 })` and the shared
  `WEEK_SUNDAY` agree; the workouts-this-week count is correct as written.

**Shared code**

- Logic both clients need goes in `packages/shared`, not copied. The precedent is
  `packages/shared/src/domain/goals.ts`, extracted for exactly this reason and already
  consumed by `mobile/src/screens/GoalsScreen.tsx:15`. `targets.ts` sits beside it.
- The shared package must not import a client's API types. `resolveMacroTargets` takes a
  structural `{ macroCarbs?, macroFat?, macroProtein? }`, the way `GoalProgressDeps`
  (`domain/goals.ts:26-30`) takes structural food/workout/check-in shapes rather than the
  web's `FoodEntry`.

**Mobile**

- Never inline a hex colour in `mobile/src` — the AST guards in `mobile/src/theme/__tests__`
  fail the build on it. Any new Expo UI goes through `useThemedStyles` / `useAppTheme`.
- Expo tests must not leave a React Query client alive; export pure wiring from the screen and
  test that, per the comment at `mobile/src/screens/GoalsScreen.tsx:18-29`.

**Critical rules**

- Never break existing functionality: `frontend/src/pages/Home.test.tsx` pins
  `calorieGoal: 2400`, and it must pass **unedited** after the web-side refactor. If it needs
  editing, the refactor changed behaviour.
- Per-user data stays bounded: this adds one single-row `GET /api/profile`, no history read.
- API shapes don't change — the MCP server consumes the same endpoints, and so, now, does the
  Expo client.
</content>
