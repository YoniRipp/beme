# Expo Shell Parity — Tab Set, Destinations and Screen Names

## Why this exists

The two clients disagree about **how many destinations the app has, which of them are one tap
away, and what each one is called.** The web ships four tabs; Expo ships six, and three of
them carry names the web deliberately retired in
`agent-os/specs/2026-08-15-1200-single-role-nav-and-custom-exercises/`.

This is not cosmetic drift. Someone who uses the PWA and then installs the native app is
handed a different app: a different number of tabs, a different order, and a tab called
"Energy" where they learned to tap "Food".

The web is the reference — it ships to users today, and its four-tab bar was a decision with
written reasoning, not a default.

## The gap, measured

Web bottom bar (`frontend/src/components/layout/Base44Layout.tsx:66-71`), rendered by
`BottomNavigation.tsx`:

| # | Label | Route |
|---|---|---|
| 1 | Home | `/` |
| 2 | Workouts | `/body` |
| 3 | Food | `/energy` |
| 4 | Profile | `/settings` |

Expo tab bar (`mobile/src/navigation/MainTabs.tsx:47-56`):

| # | Label | Screen | Icon |
|---|---|---|---|
| 1 | Home | `HomeScreen` | `home` |
| 2 | **Body** | `BodyScreen` | `dumbbell` |
| 3 | **Energy** | `EnergyScreen` | `lightning-bolt` |
| 4 | **Goals** | `GoalsScreen` | `target` |
| 5 | **Insights** | `InsightsScreen` | `chart-line` |
| 6 | **Settings** | `SettingsScreen` | `cog` |

Two tabs that the web decided do not belong in the bar, and three labels from before the
rename. The 2026-08-15 plan records the rename explicitly: *"Sidebar renamed Journal → Food
and Settings → Profile so the two navs agree."* Expo still says Energy, Settings — and its
food screen is still titled **"Journal"** (`mobile/src/screens/EnergyScreen.tsx:198`), the
exact string that rename removed.

Titles inside the screens have drifted the same way:

| Destination | Web chrome title | Web page title | Expo header (route key) | Expo screen title |
|---|---|---|---|---|
| Home | Home | Hey `{firstName}` | **TrackVibe** | Good morning, `{name}` |
| Workouts | Workouts | Workouts | **Body** | Workouts ✅ |
| Food | Food | Food log | **Energy** | **Journal** |
| Goals | Goals | Stay on target | Goals | **Goals** |
| Insights | Insights | Patterns | Insights | *(none)* |
| Profile | Profile | Settings | **Settings** | Settings |

Web chrome titles come from `ROUTE_TO_TITLE` (`Base44Layout.tsx:38-47`); web page titles from
each page's `PageHeader`. Expo's header title is the React Navigation route key, because
`MainTabs` sets `headerTitle` on Home only.

Modal titles disagree on the verb: the web says **Add** (`Add Workout`, `Add Food Entry`,
`Add Goal`), Expo says **New** / **Log** (`New Workout`, `Log Food`, `New Goal`, `Log Sleep`).

## Decisions

### Four tabs, and they are the web's four

Home · Workouts · Food · Profile, in that order, matching `BOTTOM_NAV`. The reasoning is
already written down and does not need re-deriving: the bar holds *"the four things someone
opens the app to do"*, and Goals is *"a set-and-forget screen people visit occasionally"*.
Insights is the same kind of screen — the web has never had it in the bar.

Six tabs is also worse on its own terms at 390px: six labels across a phone forces 10px type
and gives each target roughly 65px of width against the 44px minimum in
`agent-os/standards/frontend/mobile-ui.md` — technically passing, with nothing to spare.

### Goals and Insights leave the bar, and they need somewhere to land

On the web they leave the bar into the sidebar drawer, which is always one hamburger tap away
(`SIDEBAR_NAV_BASE`, `Base44Layout.tsx:49-56`). **Expo has no drawer and no secondary nav at
all** — `mobile/package.json` has `@react-navigation/bottom-tabs` and `native-stack`, not
`drawer` — so "conform to the web" does not name a destination here. This is the one genuinely
open question in this spec; see Open questions below.

The recommendation carried into the plan is **rows on the Profile tab that push stack screens**
(`Profile → Goals`, `Profile → Insights`). It keeps both screens exactly one tap further away
than the web's drawer does, needs no new dependency, and matches how every native app of this
shape hangs secondary destinations off the account tab. A hamburger drawer on iOS would be
conforming to the web's *mechanism* rather than its *intent*.

Both screens keep working and keep their routes. Nothing is deleted.

### Route keys are renamed with the labels

`Body` → `Workouts`, `Energy` → `Food`, `Settings` → `Profile` in `MainTabParamList`
(`mobile/src/types/navigation.ts:11-18`), `MainTabs`, and `TAB_ICONS`. The keys are not
cosmetic: they are the header titles, the analytics screen names React Navigation emits, and
the strings every `navigation.navigate()` call site passes. Leaving them at the old names
while relabelling the tabs is how the current mismatch happened in the first place — the label
was a `tabBarLabel` override and the key underneath was never touched.

The screen *files* (`BodyScreen.tsx`, `EnergyScreen.tsx`, `SettingsScreen.tsx`) keep their
names. The web has the same split — the route is `/energy`, the tab says Food — and renaming
files is churn that breaks nothing and helps nobody. The 2026-08-15 spec made the same call:
*"Food is `/energy`. The route keeps its name; only the label changes."*

### The screens' own titles come from the web

- Food: `Journal` → **`Food log`**, subtitle from `frontend/src/pages/Energy.tsx:369-372`.
- Goals: `Goals` → **`Stay on target`** (`frontend/src/pages/Goals.tsx:40`). The subtitle
  already matches verbatim.
- Workouts: subtitle `Plan, log, and review your training.` → **`Track strength, cardio, and
  weekly consistency.`** (`frontend/src/pages/Body.tsx:196`). The title already matches.
- Insights: gains a title block it currently has no equivalent of — **`Patterns`**, subtitle
  `Trends from your recent activity.` `InsightsScreen` is the one tab screen that does not use
  `MobileScreen`, which is why it has no header at all.
- Profile: title and subtitle already match the web verbatim. Nothing to do.

The web's `kicker` (the small uppercase word above the title) has no Expo counterpart and does
not need one on native, where the navigation header carries that role.

### Home's header stops saying TrackVibe

`MainTabs.tsx:50` sets `headerTitle: 'TrackVibe'` on Home. The web's top bar says **Home**
there. A native app does not need to tell you which app you are in on every launch, and the
inconsistency is visible the moment someone compares the two clients side by side.

### Modal verbs become "Add"

`New Workout` → `Add Workout`, `Log Food` → `Add Food Entry`, `New Goal` → `Add Goal`, to match
the web's `DialogTitle` strings. Edit-side titles already agree. Sleep has no web dialog title
to copy (`SleepEditModal`), so `Log Sleep` stays.

### Destinations Expo does not have

Recorded here because the IA map should be complete, **not** claimed by this PR:

- **Water** (`/water`) — a real web route, reachable from the Home water card
  (`frontend/src/components/home/WaterTracker.tsx:40`), absent from the sidebar and the bar.
  Expo has no water code at all. Belongs to the health-trackers sub-project.
- **Forgot password** (`/forgot-password`) — the web's Login links to it
  (`frontend/src/pages/Login.tsx:88`). Expo's `AuthStack`
  (`mobile/src/navigation/RootNavigator.tsx:19-26`) has Login and Signup only, and
  `LoginScreen` offers no recovery link. **A native user who forgets their password is at a
  dead end.** Belongs to the account sub-project; flagged here because it is a
  route-table hole with a real user consequence, not a missing feature.

### What is *not* a misalignment

Checked and deliberate, per `agent-os/specs/2026-09-12-1230-mobile-foundation/shape.md`:

- **No admin screens on Expo.** The web has seven `/admin/*` routes behind `AdminRouteGuard`;
  the owner scoped admin out of the native client.
- **No marketing routes on Expo** (Pricing, About, Privacy, Terms, Contact under
  `PublicLayout`). Same decision. Worth revisiting only when the App Store submission needs a
  privacy-policy link reachable from inside the app.

## Open questions

1. **Where do Goals and Insights live on native?** Recommendation: rows on the Profile tab
   pushing stack screens. Alternative: `@react-navigation/drawer` mirroring the web's sidebar
   one-for-one — a closer structural copy, an extra dependency, and un-idiomatic on iOS. This
   is a product call, recorded rather than taken.
2. **Should the tab manifest be shared?** The rename drifted because two clients each hold
   their own copy of the same list. A `packages/shared/src/nav` exporting the four
   `{ key, label }` pairs, consumed by `BOTTOM_NAV` and `MainTabs`, would make the next rename
   a one-line change that cannot half-land. Cost: a shared module that is neither types nor
   domain logic. Recommendation: yes, labels only — no icons, no paths.
3. **Which Food icon is canonical?** The web itself is inconsistent: `Flame` in the bottom bar,
   `BookOpen` in the sidebar (`Base44Layout.tsx:52` vs `:69`). Expo uses `lightning-bolt`,
   which matches neither. Recommendation: flame (`fire` in MaterialCommunityIcons), because the
   bottom bar is the surface both clients share. Profile becomes `account`, not `cog`.

## Constraints

- **Client-only.** No API change, no backend change, no `frontend/` change.
- The `MainTabParamList` renames are compile-checked — `npx tsc --noEmit` in `mobile/` is the
  real test that every call site moved.
- `mobile/` tests must stay green, and the **count** must not drop; see the dependency-gotchas
  note in the ledger. Adding stack screens does not touch existing suites, but the param-list
  rename does touch typed navigation in the form screens.
- Nothing in this PR removes a screen or a capability. Goals and Insights stay reachable at
  every step.
