import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import {
  type DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabs } from './MainTabs';
import { DRAWER_ITEMS } from './drawerItems';
import { useAuth } from '../context/AuthContext';
import { fonts, radius, spacing } from '../theme';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useThemeContext } from '../theme/ThemeContext';

/**
 * The left navigation the web has had all along, which this client never did.
 *
 * `Base44Layout.tsx` renders its `<aside>` at `w-72` with `-translate-x-full lg:translate-x-0`:
 * permanent from the `lg` breakpoint up, and an off-canvas drawer behind a hamburger below it,
 * over a scrim, with the bottom bar still on screen. A phone is always below `lg`, so the
 * drawer — not the permanent rail — IS the web's mobile design, and `drawerType: 'front'`
 * with the tabs left mounted underneath is the same arrangement.
 *
 * The web's own nav (Home/Workouts/Food/Goals/Insights/Profile) is deliberately NOT copied
 * here. Renaming this client's screens is #306, which `docs/HANDOFF.md` sequences last and
 * alone precisely because it collides with every other Expo change in flight. These entries
 * therefore track the existing tab routes, and #306 renames both in one place when it lands.
 */

/** `w-72`. */
const DRAWER_WIDTH = 288;

function DrawerContent(props: DrawerContentComponentProps) {
  const { user } = useAuth();
  const { colors } = useThemeContext();
  const insets = useSafeAreaInsets();

  /**
   * The focused TAB, not the focused drawer route. The drawer has exactly one screen
   * (`MainTabs`), so `props.state` reports that single route as focused no matter which tab
   * is on screen — reading it would light up every row at once. The tab state is the nested
   * navigator's, one level down.
   */
  const tabState = props.state.routes[props.state.index]?.state;
  const activeRoute =
    typeof tabState?.index === 'number' ? tabState.routes[tabState.index]?.name : 'Home';

  const styles = useThemedStyles((c) => ({
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    // `w-10 h-10 rounded-md bg-primary` with the leaf mark.
    logoMark: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // `font-display text-2xl font-medium tracking-tight leading-none`.
    wordmark: {
      fontFamily: fonts.display,
      fontSize: 24,
      color: c.text,
      letterSpacing: -0.4,
    },
    // `text-caption uppercase tracking-[0.22em]` — 0.22em at 11px is ~2.4px.
    tagline: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 2.4,
      marginTop: spacing.xxs,
    },
    // `px-3 mb-2 text-caption uppercase tracking-[0.18em]` — 0.18em at 11px is ~2px.
    sectionLabel: {
      fontFamily: fonts.semibold,
      fontSize: 11,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 2,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    nav: {
      paddingHorizontal: spacing.md,
    },
    // `flex items-center gap-3 px-3 py-2.5 rounded-xl`.
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: radius.xl,
      marginBottom: spacing.xxs,
    },
    // `bg-primary/10 text-primary`. `primarySoft` is that blend already resolved for both
    // schemes; a literal 10% alpha here would be a hex value the palette guard rejects.
    itemActive: {
      backgroundColor: c.primarySoft,
    },
    itemLabel: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: c.textMuted,
      flex: 1,
    },
    itemLabelActive: {
      color: c.primary,
      fontFamily: fonts.semibold,
    },
    // `p-4 mx-3 mb-4 rounded-2xl bg-muted`.
    footer: {
      backgroundColor: c.muted,
      borderRadius: radius.xxl,
      padding: spacing.lg,
      marginHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    footerTitle: {
      fontFamily: fonts.display,
      fontSize: 14,
      color: c.text,
    },
    footerBody: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: c.textMuted,
      marginTop: spacing.xs,
      lineHeight: 18,
    },
  }));

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingTop: 0, paddingBottom: insets.bottom + spacing.lg }}
    >
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <Icon source="leaf" size={20} color={colors.primaryForeground} />
        </View>
        <View>
          <Text style={styles.wordmark}>TrackVibe</Text>
          <Text style={styles.tagline}>Life Balance</Text>
        </View>
      </View>

      <View style={styles.nav}>
        <Text style={styles.sectionLabel}>Navigate</Text>
        {DRAWER_ITEMS.map((item) => {
          const isActive = item.route === activeRoute;
          return (
            <Pressable
              key={item.route}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
              style={[styles.item, isActive && styles.itemActive]}
              onPress={() => {
                // Closing is not implied by navigating. The drawer owns exactly one screen,
                // so moving between TABS never changes the drawer's own route and it has no
                // reason to dismiss itself — the panel just sits open over the screen it
                // just switched to. The web closes its off-canvas on link click
                // (`Base44Layout.tsx` clears `sidebarOpen`), so this does too.
                props.navigation.navigate('MainTabs', { screen: item.route });
                props.navigation.closeDrawer();
              }}
            >
              <Icon
                source={item.icon}
                size={18}
                color={isActive ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>
                {item.label}
              </Text>
              {isActive ? <Icon source="chevron-right" size={14} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Your journey</Text>
        <Text style={styles.footerBody}>
          {user?.name
            ? `Every step counts, ${user.name.split(' ')[0]} — keep showing up.`
            : 'Every step counts — keep showing up.'}
        </Text>
      </View>
    </DrawerContentScrollView>
  );
}

const Drawer = createDrawerNavigator();

export function AppDrawer() {
  const { colors } = useThemeContext();

  return (
    <Drawer.Navigator
      // `front` keeps the tabs mounted and slides the panel over them behind a scrim, which
      // is what the web does below `lg`. `slide`/`permanent` would push or pin the content
      // and reproduce the DESKTOP layout on a phone instead.
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: DRAWER_WIDTH,
          backgroundColor: colors.surface,
          borderRightColor: colors.border,
          borderRightWidth: 1,
        },
        // `bg-scrim/50 backdrop-blur-sm`. There is no backdrop filter in React Native, so
        // the blur is dropped rather than faked; the scrim colour carries the same role.
        overlayColor: colors.scrim,
        swipeEdgeWidth: 40,
      }}
      drawerContent={(props) => <DrawerContent {...props} />}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} />
    </Drawer.Navigator>
  );
}
