/**
 * The drawer's destinations, kept apart from `AppDrawer.tsx` deliberately.
 *
 * Importing the component pulls in `@react-navigation/drawer`, and through it
 * `react-native-reanimated` and `react-native-gesture-handler` — native modules that a Jest
 * run has no host for. A test that only wants to read this list would have to stand up mocks
 * for all of it, so the list lives in a module with no imports at all and both the navigator
 * and `__tests__/drawerMatchesTabs.test.ts` read it from here.
 *
 * These track `MainTabs`' routes rather than the web's own sidebar names
 * (Home/Workouts/Food/Goals/Insights/Profile). Renaming this client's screens is #306, which
 * `docs/HANDOFF.md` sequences last and alone because it collides with every other Expo change
 * in flight; the guard test keeps the two lists together when that rename lands.
 */
export interface DrawerItem {
  /** Route name in `MainTabs`. */
  route: string;
  label: string;
  /** Material Community Icons name, as `react-native-paper`'s `Icon` takes it. */
  icon: string;
}

export const DRAWER_ITEMS: readonly DrawerItem[] = [
  { route: 'Home', label: 'Home', icon: 'home' },
  { route: 'Body', label: 'Body', icon: 'dumbbell' },
  { route: 'Energy', label: 'Energy', icon: 'lightning-bolt' },
  { route: 'Goals', label: 'Goals', icon: 'target' },
  { route: 'Insights', label: 'Insights', icon: 'chart-line' },
  { route: 'Settings', label: 'Settings', icon: 'cog' },
];
