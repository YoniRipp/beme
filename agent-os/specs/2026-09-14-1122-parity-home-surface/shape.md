# Home Parity — The Missing Half of the Dashboard

The sibling spec (`2026-09-14-1120-parity-home-daily-targets`) covers the *numbers* the two
Homes disagree about. This one covers what the two Homes actually **render**: five whole
cards the Expo client has no equivalent of, a quick-log grid that lost a row and its state,
a header that reads differently, a loading strategy that blocks the screen, and a first-run
path that does not exist.

## Section-by-section

Web (`frontend/src/pages/Home.tsx`) vs Expo (`mobile/src/screens/HomeScreen.tsx`), in render
order:

| # | Web | Expo | Status |
|---|---|---|---|
| 1 | `PageHeader`: date kicker → "Hey Yoni" → progress message → 42 px profile button | native header "TrackVibe" + "Good morning, Yoni Ripp" + full date | **Differs** (see Header) |
| 2 | Today's fuel: 132 px `ProgressRing` + protein/carb/fat bars + edit pencil | hero card: big number + linear bar, no macro breakdown | **Differs** |
| 3 | `StreakCard` — workout/food/water streaks, personal-best trophy | — | **Missing on Expo** |
| 4 | `SectionHeader "Quick log"` + **2×2** tile grid with logged-today pills | 3 stacked full-width buttons, no pills | **Differs** |
| 5 | `WaterTracker` — glasses/goal, ml, ±1 controls | — | **Missing on Expo** |
| 6 | `WeightProgress` — latest, target delta, kg/wk trend, 7-bar sparkline | — | **Missing on Expo** |
| 7 | `CycleTracker`, gated on `profile.cycleTrackingEnabled` | — | **Missing on Expo** |
| 8 | Recent activity — 5 newest food + workout items, tap to drill in | — | **Missing on Expo** |
| 9 | — | "Set your first goal" prompt when `goals.length === 0` | **Missing on web** (web puts this on the Goals page) |
| 10 | Six modals (goal, workout, food, sleep, macro, weight) | four modal *screens* via the stack navigator, no weight, no macro | **Differs** |

## Why Expo is missing five cards: it has no client for them

`mobile/src/core/api/` contains `auth`, `client`, `food`, `goals`, `pagination`, `users`,
`workouts`. There is **no `health.ts`** — which is where the web keeps `profileApi`,
`weightApi`, `waterApi`, `cycleApi` and `streakApi` (`frontend/src/core/api/health.ts`).
`mobile/src/hooks/` has five hooks against the web's forty-plus, and none of them is
`useProfile`, `useWeight`, `useWater`, `useCycle` or `useStreaks`.

Every endpoint already exists and is mounted (`backend/src/routes/index.ts:50-56`:
`profileRouter`, `weightRouter`, `waterRouter`, `cycleRouter`, `streakRouter`). Nothing on the
backend is needed. This is a client gap, not a product gap.

## Header

- **Web:** `EEE · MMM d` as an uppercase kicker *above* the title, "Hey {firstName}" (first
  name only — `user?.name?.split(' ')[0] ?? 'there'`), then a progress message that reacts to
  how many meals are logged ("Start tracking your progress" → "Keep going!" → "Great
  progress!" → "Crushing it!"), and a circular profile button that routes to `/settings`.
- **Expo:** the tab navigator paints a native header reading **"TrackVibe"**
  (`mobile/src/navigation/MainTabs.tsx:50`), and then `MobileScreen` paints a *second* title
  underneath: "Good morning, {full name}" over `EEEE, MMMM d`. So the screen has two stacked
  headings, a time-of-day greeting the web does not have, the user's full name where the web
  uses first name only, a long date format, and no profile affordance (Settings is a tab).

The greeting difference is not obviously a bug in Expo's favour or the web's — recorded as an
open question, not silently resolved.

## Quick log

- **Web:** a 2×2 grid of `QuickTile`s — Log food, Log workout, Log sleep, Log weight. Two
  carry a pill showing what is already logged today (`7.5h`, `82kg`). The comment at
  `Home.tsx:248-249` explains both choices: 2×2 so no tile is orphaned on a half row, and the
  pill so the action stays reachable *after* it has been used.
- **Expo:** three full-width `Button`s stacked vertically — Log Food (contained), Workout
  (outlined), Sleep (outlined). No weight action at all, no logged-today state, and a
  primary/secondary hierarchy the web does not have.

## Loading

- **Web:** the fuel card is gated on `energyLoading` **alone**, with a bespoke skeleton, and
  the comment at `Home.tsx:173-174` says why: "it is the reason people open the app, so it
  must not wait on the workouts query behind it." Recent activity — the one section that
  genuinely needs both queries — has its own skeleton.
- **Expo:** `if (loading) return <LoadingView />` where `loading = goalsLoading ||
  workoutsLoading || energyLoading` (`HomeScreen.tsx:95,133`). A full-screen centred spinner
  replaces everything, including the greeting, until the slowest of three whole-history
  queries lands. The web's deliberate layering is exactly inverted.

## First run and empty states

- **Web:** `Home.tsx:149-151` gates the entire page — an unfinished profile renders
  `SetupWizard` (5 steps: welcome, basic info, body stats, activity, complete) instead of the
  dashboard. `WeightProgress` has a "No weight logged yet" state with a CTA. `StreakCard`
  returns `null` rather than rendering an empty shell. The fuel card renders 0 against the
  target with encouraging copy.
- **Expo:** no setup wizard, no profile concept, no gate — `RootNavigator` goes Login/Signup →
  `MainTabs` and a brand-new account lands on a dashboard of zeros. Expo's one empty
  affordance is a "Set your first goal" prompt card, which the web Home does not have (the web
  puts that `EmptyState` on the Goals page instead).

## Decisions

- **The web is the reference. Expo grows toward it, the web does not shrink.** No web card is
  removed to make the two match.
- **Sequence the Expo work by user value, not by file order.** Water and weight first (daily
  loop, and weight is already a web quick-log action), then streaks, then recent activity,
  then cycle. Each is independently shippable.
- **Reuse what Expo already has.** `mobile/src/components/shared/ProgressRing.tsx` exists,
  renders an SVG ring with a centred value, is theme-safe — and is **imported by nothing**
  (the only other reference is the theme guard test). The fuel card's ring is a wiring job,
  not a new component.
- **`MetricCard` stays.** Expo's stat tiles are a good pattern; the four missing cards become
  Expo-idiomatic Paper cards rather than transliterated Tailwind.
- **Do not copy the web's unbounded weight read.** `frontend/src/hooks/useWeight.ts:16` calls
  `weightApi.list()` with no date window, and the controller only paginates when the client
  asks (`backend/src/controllers/weight.ts:15`, `parseOptionalPagination`), so the web pulls a
  user's **entire** weight history to draw seven bars. That is critical rule 6. Expo's client
  passes a date window from day one, and fixing the web is filed as its own task rather than
  smuggled in here.
- **Quick log becomes a 2×2 tile grid on Expo**, with the weight action and the logged-today
  pills, for the reasons the web's own comment gives.
- **Loading gets layered on Expo**: header renders immediately, the fuel card waits only on
  `energyLoading`, each added card owns its own skeleton.
- **Not filed here, flagged for whoever owns it:** `mobile/src` contains **zero** references to
  voice, mic or speech, while `CLAUDE.md` calls voice "the primary input method" and
  `frontend/mobile-ui` requires exactly one voice entry point per viewport (the bottom nav's
  centre mic). That is a navigation/voice-shell gap, not a Home-screen gap, and belongs to
  that agent.

## Open questions — do not decide these in the PR

**Q1. The greeting.** Web: "Hey Yoni" + a progress message. Expo: "Good morning, Yoni Ripp" +
the date. Expo's time-of-day greeting is warmer; the web's progress message is more useful and
changes as the day goes on. *Recommendation:* keep the web's structure (first name, progress
message as the subtitle) and fold Expo's time-of-day greeting into it on **both** clients —
"Good morning, Yoni" over "Crushing it!". That is a change to the reference client, so it
needs sign-off.

**Q2. Expo's duplicated heading.** The native tab header says "TrackVibe" and `MobileScreen`
immediately paints a second heading. *Recommendation:* hide the native header on Home
(`headerShown: false`) so the greeting is the only title, matching the web. Needs a look at a
device to confirm the safe-area result — a claim I cannot verify from code alone.

**Q3. Does Expo need a setup wizard, or should first-run move to the server?** Porting the
5-step wizard is real work and duplicates it in two languages. *Recommendation:* port it —
`profile.setupCompleted` is already the server-side flag both clients can gate on, and without
it Expo has no way to learn target weight, height or cycle preferences, which is why four of
the missing cards would have nothing to compare against. But it is a large enough piece to be
its own spec rather than a task in this one.

**Q4. Does the "Set your first goal" prompt belong on the web Home?** Expo has it, the web
does not. *Recommendation:* leave the web alone. Its Goals page already carries an
`EmptyState` with the same copy, and Home is already a long screen.

## Constraints

- `mobile/` is the native client, actively developed since 2026-09-12 — not dormant.
- Never inline a hex colour in `mobile/src`; the AST guards in `mobile/src/theme/__tests__`
  fail the build on it.
- Don't re-file the Paper purple theme leak — another agent owns the design system. Nothing
  here depends on how that resolves.
- No API change. Every endpoint needed already ships and is consumed by the web and the MCP
  server.
- Per-user data stays bounded: every new Expo read is a single row (water today, profile), a
  small fixed list (streaks — five rows, one per type), or date-windowed (weight, cycle).
</content>
