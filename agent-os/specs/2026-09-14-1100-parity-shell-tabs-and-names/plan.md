# Plan — Expo Tab Set, Destinations and Screen Names

Status: **not started.** Written from an audit of both clients; no code has moved.

Sequencing against the other two shell-parity specs: this one goes **first**. It settles which
tabs exist, which is the input to `2026-09-14-1104-parity-shell-frame` (which rebuilds the bar)
and `2026-09-14-1102-parity-shell-voice-entry` (which adds a centre slot to it).

## Task 1 — Save spec documentation

- [x] `shape.md` — the gap, measured, and the decisions
- [x] `standards.md` — which standards apply and the points carried into the work
- [x] `references.md` — the code read before proposing anything
- [x] `plan.md` — this file

## Task 2 — Settle the open question

- [ ] Get a decision on **where Goals and Insights live** (Profile-tab rows vs a drawer).
      Everything below assumes Profile-tab rows; a drawer changes Task 5 only.
- [ ] Get a decision on the **shared tab manifest** (open question 2). If yes, it lands in
      Task 3 rather than as a follow-up — retrofitting it later means renaming twice.

## Task 3 — Cut the bar to four tabs

- [ ] `mobile/src/navigation/MainTabs.tsx` — `Tab.Screen` list becomes Home, Workouts, Food,
      Profile in that order. `GoalsScreen` and `InsightsScreen` stop being tabs.
- [ ] `TAB_ICONS` — `Workouts: 'dumbbell'`, `Food: 'fire'`, `Profile: 'account'`. Drop the
      `Goals` / `Insights` entries.
- [ ] Drop `headerTitle: 'TrackVibe'` from Home so its header reads **Home**, matching
      `ROUTE_TO_TITLE['/']`.
- [ ] `mobile/src/types/navigation.ts` — `MainTabParamList` keys become
      `Home | Workouts | Food | Profile`; `Goals` and `Insights` move to `RootStackParamList`.
- [ ] Fix every `navigation.navigate(...)` call site the rename breaks. `npx tsc --noEmit` in
      `mobile/` is the check — do not grep for it.

## Task 4 — Rename what the user reads

- [ ] `EnergyScreen.tsx:198` — `title="Journal"` → `title="Food log"`, subtitle from
      `frontend/src/pages/Energy.tsx:369-372`.
- [ ] `GoalsScreen.tsx:47` — `title="Goals"` → `title="Stay on target"`. Subtitle already
      matches; leave it.
- [ ] `BodyScreen.tsx:100` — subtitle → `Track strength, cardio, and weekly consistency.`
- [ ] `InsightsScreen.tsx` — wrap in `MobileScreen title="Patterns" subtitle="Trends from your
      recent activity."`. It is the only tab screen not using the shell component, which is
      why it has no title block; the empty state at `:58` returns early and must keep doing so.
- [ ] `SettingsScreen.tsx:53` — no change. Title and subtitle already match the web verbatim.
- [ ] Modal titles: `WorkoutFormScreen.tsx:70` → `Add Workout`, `FoodEntryFormScreen.tsx:130` →
      `Add Food Entry`, `GoalFormScreen.tsx:33` → `Add Goal`. Edit-side strings already match.
      `SleepFormScreen.tsx:28` unchanged — the web has no dialog title to copy.

## Task 5 — Give Goals and Insights a home

Assumes the Profile-rows decision from Task 2.

- [ ] Register `Goals` and `Insights` on `AppStack`
      (`mobile/src/navigation/RootNavigator.tsx:40-60`) as pushed screens — **not** modals.
      They are destinations, not forms; a modal presentation would make them feel like
      something you dismiss rather than somewhere you went.
- [ ] `SettingsScreen` — a navigation section above `Account` with two `List.Item` rows
      (`target` → Goals, `chart-line` → Insights), each with a chevron. Same order as the web's
      sidebar.
- [ ] Confirm the header back button carries the right title on both pushed screens.
- [ ] Check `GoalFormScreen`'s return path still lands on Goals after
      `navigation.goBack()` (`GoalFormScreen.tsx:50`) now that Goals is a stack screen rather
      than a tab.

## Task 6 — Tests

- [ ] A `MainTabs` test asserting **four** tabs, in order, with those labels — the Expo
      counterpart of `frontend/src/components/layout/Base44Layout.test.tsx:53-58`. `mobile/`
      has no navigation test today, which is the reason this drift was invisible.
- [ ] A test asserting Goals and Insights are reachable but **not** in the bar — the
      counterpart of the web's *"keeps Goals in the sidebar while leaving it out of the bottom
      bar"* test.
- [ ] `npm test -w mobile` green **and the test count checked**, not just the exit code.
- [ ] `npx tsc --noEmit` in `mobile/` and `packages/shared`.

## Task 7 — Shared tab manifest (only if Task 2 says yes)

- [ ] `packages/shared/src/nav/index.ts` — four `{ key, label }` pairs and nothing else. No
      icons (different icon sets), no paths (`/energy` is a web concept).
- [ ] `./nav` subpath in `packages/shared/package.json`, beside `./settings`.
- [ ] `BOTTOM_NAV` in `Base44Layout.tsx` maps the shared list to its paths and lucide icons;
      `MainTabs` maps it to screens and MaterialCommunityIcons names.
- [ ] `frontend/` stays green — the existing nav test asserts the four labels, so a wrong
      mapping fails there rather than in review.

## Not in this plan

- The Water screen and the forgot-password screen. Recorded in `shape.md` as IA holes; owned
  by the health-trackers and account sub-projects.
- Anything about how the bar *looks* — height, safe area, the floating pill. That is
  `2026-09-14-1104-parity-shell-frame`.
- The centre microphone. That is `2026-09-14-1102-parity-shell-voice-entry`, which adds a slot
  to the four-tab bar this plan produces.
