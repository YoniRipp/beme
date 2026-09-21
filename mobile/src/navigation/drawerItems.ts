/**
 * The drawer's destinations, kept apart from `AppDrawer.tsx` deliberately.
 *
 * Importing the component pulls in `@react-navigation/drawer`, and through it
 * `react-native-reanimated` and `react-native-gesture-handler` — native modules that a Jest
 * run has no host for. A test that only wants to read this list would have to stand up mocks
 * for all of it, so the list lives in a module with no imports at all and both the navigator
 * and `__tests__/drawerMatchesTabs.test.ts` read it from here.
 *
 * LABELS now match the web's sidebar (`SIDEBAR_NAV_BASE` in `Base44Layout.tsx`) -- Home,
 * Workouts, Food, Goals, Insights, Profile -- while the ROUTE names stay as they are. The
 * two are separate on purpose: renaming routes is #306 in `docs/HANDOFF.md`, sequenced last
 * because it collides with every other Expo change in flight, and nothing about showing the
 * right word to a user requires waiting for it.
 *
 * ICONS follow the web's sidebar too, which means Food is a book here and a flame on the tab
 * bar. That is not a slip: the web's own `SIDEBAR_NAV_BASE` uses `BookOpen` where its
 * `BOTTOM_NAV` uses `Flame`, and this mirrors it rather than quietly picking a side. Worth
 * unifying one day; worth doing deliberately rather than as a side effect of this change.
 *
 * The drawer is now a SUPERSET of the tab bar, not a mirror of it -- the bar carries four
 * destinations and this carries six, so Goals and Insights are reachable only from here.
 * `__tests__/drawerMatchesTabs.test.ts` pins both halves of that. */
export interface DrawerItem {
  /** Route name in `MainTabs`. */
  route: string;
  label: string;
  /** Material Community Icons name, as `react-native-paper`'s `Icon` takes it. */
  icon: string;
}

export const DRAWER_ITEMS: readonly DrawerItem[] = [
  { route: 'Home', label: 'Home', icon: 'home' },
  { route: 'Body', label: 'Workouts', icon: 'dumbbell' },
  { route: 'Energy', label: 'Food', icon: 'book-open-variant' },
  { route: 'Goals', label: 'Goals', icon: 'target' },
  { route: 'Insights', label: 'Insights', icon: 'trending-up' },
  { route: 'Settings', label: 'Profile', icon: 'account' },
];
