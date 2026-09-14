# Reference Implementations Studied

Everything in `shape.md` was read out of these files. Nothing was inferred from a running app —
neither client was launched for this audit.

## The web's navigation (the reference)

- `frontend/src/components/layout/Base44Layout.tsx` — `ROUTE_TO_TITLE` (`:38-47`),
  `SIDEBAR_NAV_BASE` (`:49-56`), `BOTTOM_NAV` (`:66-71`) with the four-tab comment that
  explains why Goals is not in it, and the mobile top bar (`:218-256`)
- `frontend/src/components/layout/BottomNavigation.tsx` — the bar itself: split items, centre
  mic, `pb-safe`
- `frontend/src/components/layout/Base44Layout.test.tsx` — asserts the four tabs in order,
  their destinations, and Goals-in-sidebar-not-in-bar. The shape a mobile test should copy
- `frontend/src/routes.tsx` — the full route table, including the seven `/admin/*` routes and
  the public/marketing tree that Expo deliberately does not have
- `frontend/src/components/ui/page.tsx` — `PageHeader`'s kicker / title / subtitle contract
- `frontend/src/pages/{Home,Body,Energy,Water,Goals,Insights,Settings}.tsx` — the exact title
  and subtitle strings this spec copies
- `frontend/src/components/body/WorkoutModal.tsx:1070`,
  `frontend/src/components/energy/FoodEntryModal.tsx:458`,
  `frontend/src/components/goals/GoalModal.tsx:86` — the "Add X" / "Edit X" dialog titles
- `frontend/src/components/home/WaterTracker.tsx:40` — the only in-app link to `/water`
- `frontend/src/pages/Login.tsx:88` — the forgot-password link Expo has no counterpart for

## The Expo shell (the thing that drifted)

- `mobile/src/navigation/MainTabs.tsx` — six `Tab.Screen`s, `TAB_ICONS`, and the Home
  `headerTitle` override
- `mobile/src/navigation/RootNavigator.tsx` — `AuthStack` (Login/Signup only) and `AppStack`
  (Main + four modals)
- `mobile/src/types/navigation.ts` — `RootStackParamList` and `MainTabParamList`
- `mobile/src/components/shared/MobileScreen.tsx` — the in-content title block every tab screen
  but Insights uses
- `mobile/src/screens/{Home,Body,Energy,Goals,Insights,Settings}Screen.tsx` — the titles and
  subtitles being corrected
- `mobile/src/screens/{Workout,FoodEntry,Sleep,Goal}FormScreen.tsx` — the
  `navigation.setOptions({ title })` calls that name the modals
- `mobile/package.json` — confirms there is no `@react-navigation/drawer`, so the web's
  hamburger has no counterpart to conform to

## The decisions that constrain this one

- `agent-os/specs/2026-08-15-1200-single-role-nav-and-custom-exercises/shape.md` — why the bar
  is four tabs and why Goals left it
- `agent-os/specs/2026-08-15-1200-.../plan.md` Task 4 — the Journal → Food and
  Settings → Profile rename this spec finishes on the native side
- `agent-os/specs/2026-09-12-1230-mobile-foundation/shape.md` — parity is eight sub-projects;
  admin and marketing screens are scoped out of Expo on purpose
- `agent-os/specs/2026-09-12-1700-mobile-theme-shell/theme-shell-plan.md` — "web wins" as a
  standing rule for this phase
