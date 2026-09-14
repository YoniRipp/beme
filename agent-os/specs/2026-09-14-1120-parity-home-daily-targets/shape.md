# Home Parity — One Set of Daily Targets, Not Two

## The report

> The web shows a 2400 kcal goal. The Expo app shows 2000 for the same account.

Confirmed, and the cause is not a bug in either number. The two clients read the user's
daily calorie target out of **two different backing stores**, and each falls back to its own
invented default when its store is empty.

- Web: `frontend/src/pages/Home.tsx:41` → `useMacroGoals().calorieGoal`, which is
  `carbs * 4 + fat * 9 + protein * 4` over `profile.macroCarbs / macroFat / macroProtein`
  (`frontend/src/hooks/useMacroGoals.ts:30`), i.e. `GET /api/profile`.
- Expo: `mobile/src/screens/HomeScreen.tsx:112-113` →
  `goals.find((g) => g.type === 'calories' && g.period === 'daily')?.target || 2000`,
  i.e. `GET /api/goals`.

Two details make this worse than "different sources":

1. **2400 is the web's default, not the user's setting.** `useMacroGoals.ts:10` defaults to
   `{ carbs: 300, fat: 80, protein: 120 }` → 2400 kcal. Nothing in the first-run path ever
   writes macro grams: `SetupWizard` (`frontend/src/components/onboarding/SetupWizard.tsx:49`)
   saves sex, DOB, height, weights, activity level and cycle settings, and no macros. The
   only writer is the Home pencil button → `MacroGoalModal`. So the common case is *both*
   clients showing a made-up number, and two different made-up numbers at that.
2. **A user who sets a calorie goal on the web Goals page is ignored by the web Home.**
   `GoalModal` defaults to `type: 'calories'` (`frontend/src/components/goals/GoalModal.tsx:31`)
   and writes the `goals` table — the row Expo reads. The web Home never looks at it. So the
   web is already internally inconsistent, and Expo happens to read the store the web's own
   Goals page writes.

`calorieGoal` as a concept does not exist anywhere in `mobile/src` — grep confirms the only
hit is the local `const` on `HomeScreen.tsx:112`.

## It is a class, not a one-off

Every number on either Home was traced to its hook and endpoint. Full table in
`references.md`; the divergences:

| Home number | Web reads | Expo reads | Agree? |
|---|---|---|---|
| Calorie target | `profile.macro*` → kcal (default **2400**) | `goals` calories/daily (default **2000**) | **No** |
| Protein target | `profile.macroProtein` (default **120 g**) | *no target at all* — bare "72g / today" | **No** |
| Carb + fat targets | `profile.macroCarbs`, `macroFat` | absent | **No** |
| Sleep | **today's** `checkIn.sleepHours`, quick-tile pill | **weekly average** of check-ins | **No** |
| Workouts this week | *not on web Home* | `goals` workouts/weekly (default **4**) | **No** |
| Calories left | *not on web Home* | `target − consumed`, clamped ≥ 0 | **No** |
| Meals logged | only as prose (`progressMessage`) | numeric, in the hero meta | Partly |
| Calories consumed today | `isSameDay` filter over `foodEntries` | `getPeriodRange('daily')` filter | **Yes** (value) |
| Protein consumed today | sum over today's entries | sum over today's entries | **Yes** |

### Hardcoded defaults, both directions

| Default | Client | Where | Verdict |
|---|---|---|---|
| 300 g carbs / 80 g fat / 120 g protein → 2400 kcal | web | `useMacroGoals.ts:10` | invented |
| 2000 kcal | Expo | `HomeScreen.tsx:113` | invented |
| 4 workouts/week | Expo | `HomeScreen.tsx:107` | invented |
| 8 glasses of water | web | `WaterTracker.tsx:13` | **benign** — mirrors `water_goal_glasses int NOT NULL DEFAULT 8` (`backend/src/db/schema.ts:228`), so it can only be reached before the profile row loads |
| 28-day cycle | web | `CycleTracker.tsx:13` | tolerable, but a client-side clinical default |

Reported honestly: the water default is not a divergence. It agrees with the column default,
so it was checked and cleared rather than filed.

## What already matches

- `useGoals` is a near-verbatim copy on both sides — same query key, same mapper, same
  mutation-writes-the-cache shape. Only `staleTime` differs (5 min mobile vs 2 min web).
- `useEnergy`'s food/check-in queries, mappers and mutation shapes match; Expo just lacks the
  batch/duplicate-day mutations the web Energy page needs (not a Home concern).
- Both clients read whole history through the same bounded pager
  (`@trackvibe/shared/api`'s `createRequestAllPages`) — one shared copy, no drift.
- Today's calories and today's protein come out to the same number on both, by different
  code paths.
- `packages/shared/src/domain/goals.ts` already centralises goal progress, and Expo's
  `GoalsScreen` uses it. That is the precedent this work follows.

## Decisions

- **The web's rule wins.** `frontend/` ships to users; Expo conforms. A daily calorie target
  is `carbs*4 + fat*9 + protein*4` over the profile's macro grams. Expo stops reading the
  `goals` table for it.
- **The derivation moves to `packages/shared`, it does not get copied.** New
  `packages/shared/src/domain/targets.ts`, sitting next to `domain/goals.ts` for the same
  reason: pure, React-free, unit-testable without rendering, and callable from a screen or a
  hook. Both Homes import it.
- **Defaults live in one exported constant.** `DEFAULT_MACRO_TARGETS` in that module. Neither
  client may spell a number like `2000` or `120` inline again.
- **Expo gets a real profile client.** `mobile/src/core/api/` has no `health.ts` at all —
  no `/api/profile`, and therefore no way to reach macros. Add the profile slice only
  (`get` + `upsert`), plus `hooks/useProfile.ts` and `queryKeys.profile`, mirroring
  `frontend/src/hooks/useProfile.ts`. Weight/water/cycle/streak clients are the sibling PR's
  problem, not this one's.
- **No API change.** `GET /api/profile` already returns `macroCarbs / macroFat / macroProtein`
  (`backend/src/models/profile.ts:8`). Nothing on the wire moves, so the MCP server is
  unaffected.
- **Expo's sleep tile switches to today's hours** to match the web quick-tile — see the open
  questions, this one is contested.
- **Expo's `staleTime`s are made explicit** on `useEnergy` and `useWorkouts` while these files
  are open, matching the web's 2 min (`frontend/data-fetching`: "always set `staleTime`").
  Today they silently inherit the 60 s client default while the web sets 2 min, so the two
  clients refetch on different schedules.

## Open questions — do not decide these in the PR

**Q1. The `goals` table's `calories`/`daily` row is a real user setting that the web Home
throws away.** A user who adds "2200 calories daily" on the web Goals page sees that goal
tracked on the Goals page and a 2400 ring on Home. Conforming Expo to the web makes Expo
*stop* honouring a target the user explicitly set — which is a regression for that user, even
though it is parity.
*Recommendation:* ship parity now (profile macros win on Home, both clients), and open
product work to collapse the two: either the Goals page's calorie goal writes through to the
profile macros, or Home surfaces both explicitly. Do not let a client pick silently.

**Q2. Expo's weekly sleep average may be the better number.** Web shows *today's* sleep on a
quick-log tile; Expo shows a *weekly average* stat. For a dashboard the average arguably reads
better — last night's 6.2 h is noise, the week's 7.1 h is a trend. This is exactly the case
the ground rules say to record rather than decide.
*Recommendation:* conform Expo to today's-sleep for parity now; if product prefers the
average, add it to **both** clients as a second metric rather than keeping the split.

**Q3. Expo's "Workouts this week" tile has no web counterpart at all.** It is a genuinely
useful number and the web Home does not show it anywhere (`startOfWeek` appears nowhere in
`frontend/src/pages/Home.tsx` or `frontend/src/components/home/`).
*Recommendation:* keep it on Expo, add it to the web Home, and give it the same shared
`resolveDailyTargets` treatment (target from the `goals` table, since there is no profile
field for it) — but adding a metric to the reference client needs sign-off, so this PR
leaves the tile in place and unchanged rather than deleting it.

## Constraints

- `mobile/` is the native client, actively developed since 2026-09-12 — not dormant. The
  root `CLAUDE.md` text saying otherwise is being corrected separately.
- Per-user data stays bounded: this work adds one `GET /api/profile` (a single row), no new
  history reads.
- Expo's theme guard (`mobile/src/theme/__tests__`) fails the build on inline hex, so any
  new Expo UI must go through `useThemedStyles`.
- Do not touch the Paper purple theme leak — another agent owns the design system.
</content>
</invoke>
