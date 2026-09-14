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

**The owner chose the goal page: the `goals` table owns the daily calorie target.** This
reverses the recommendation this shape originally carried (which was "the web's rule wins,
Expo conforms") and closes Q1 below. Consequences, as built:

- **The web moves, not Expo.** Expo already read `goals` (`type: 'calories'`,
  `period: 'daily'`) and was right. The web's Home stops deriving kcal from
  `profile.macro*` and reads the same row its own Goals page writes. That also fixes the
  standing web-only bug where a calorie goal set on the web was ignored by the web.
- **Macros stay on the profile, because the schema gives no choice.** `goals.type` is
  `calories | workouts | sleep` and cannot express protein, carbs or fat. So one card
  reads two stores. Both clients now make the same split, and `packages/shared`'s
  `domain/targets.ts` is the only place that knows it.
- **No invented targets, anywhere.** `|| 2000` (Expo), `|| 4` (Expo) and the 2400 the web
  derived from default macro grams are gone. An unset target is `null` and renders as
  unset, with a control that sets it.
- **`MacroGoalModal` became `DailyTargetsModal`, and calories is a real field in it.** The
  modal used to *derive* and display a kcal number from the grams. Once `goals` owns the
  target that derivation would be a number a user edits and never sees again, so calories
  is now an input that writes the goals row (update the displayed row, create if absent,
  delete if cleared). The derivation survives as a hint — "these macros add up to N kcal"
  with a button that fills the field — so the old mental model still works and every
  number in the sheet takes effect.
- **Sleep is last night's hours on both.** Expo's weekly average is gone. The web's tile is
  a log-today affordance whose pill can only sensibly show today, so today is what both
  show — see Q2.
- **Expo gets a real profile client.** `mobile/src/core/api/health.ts` (profile slice
  only), `hooks/useProfile.ts`, `queryKeys.profile`. Without it Expo cannot see macro
  grams at all, which is why its protein card had no target.
- **No API change.** `GET /api/profile` already carries the macro fields and `GET /api/goals`
  already carries the row. Nothing on the wire moves, so the MCP server is unaffected.

## Questions that were open, and how they closed

**Q1 — should the `goals` calories row keep losing to profile macros?** *Closed by the
owner: no. The goals table owns it.* Expo keeps honouring the row it always did, and the
web starts honouring the row it always wrote and never read.

**Q2 — is Expo's weekly sleep average the better number?** *Closed: today's hours, on
both.* The web's sleep tile is a quick-log button whose pill states what you logged today;
a weekly average on a "Log sleep" button would be a different statement from the one the
button makes. Rather than keep one tile meaning two things, both show last night. If
product wants the trend, it should be added to **both** as a second metric.

**Q3 — should the web gain Expo's "Workouts this week" tile?** *Still open, still not
done here.* Adding a metric to the reference client needs sign-off. Expo keeps the tile;
its invented `|| 4` target is gone, so it now reads "3 this week" until a weekly workout
goal exists.

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
