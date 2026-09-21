import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { Pressable } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { BodyScreen } from '../screens/BodyScreen';
import { EnergyScreen } from '../screens/EnergyScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../theme/ThemeContext';
import { fonts, spacing } from '../theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: 'home',
  Body: 'dumbbell',
  Energy: 'lightning-bolt',
  Goals: 'target',
  Insights: 'chart-line',
  Settings: 'cog',
};

/**
 * Bare height of the tab bar, before the device's bottom inset is added.
 *
 * Edge-to-edge is mandatory from Android 16, so the app draws BEHIND the gesture bar and has
 * to inset its own content. Without this the system home indicator is painted straight across
 * the tab labels -- on a 1080x2400 gesture-nav device it struck through 'ENERGY' and
 * 'GOALS' on every screen. `MobileScreen` and `AppDrawer` already take their insets
 * from `react-native-safe-area-context`; the tab bar was the one piece of chrome still
 * using a hardcoded height.
 */
const TAB_BAR_HEIGHT = 64;
const TAB_BAR_PADDING_BOTTOM = 8;

export function MainTabs() {
  const { colors } = useThemeContext();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        // `BottomNavigation.tsx:30` on the web: `text-caption font-bold uppercase
        // tracking-[0.06em]` — Inter 700 at 10px, uppercased, +0.06em (≈0.6px at this size).
        // The size and the weight number were already right; the face, the casing and the
        // tracking were not, and React Navigation style props never pass through a `<Text>`
        // import, so `rawTextNamesItsFont` could not see any of it.
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: fonts.bold,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        /**
         * The hamburger the web shows below `lg` (`Base44Layout.tsx`'s `lg:hidden` header).
         * Dispatched rather than called as `navigation.openDrawer()`: this is the TAB
         * navigator's navigation object, which has no such method — the action bubbles up to
         * the nearest drawer ancestor, so it keeps working if another navigator is ever
         * inserted between the two.
         */
        headerLeft: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            hitSlop={8}
            style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <Icon source="menu" size={24} color={colors.text} />
          </Pressable>
        ),
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        // `Base44Layout.tsx:228`: `font-display text-lg font-semibold` — Fraunces 600 at 18.
        headerTitleStyle: {
          fontFamily: fonts.displaySemibold,
          fontWeight: '600',
          fontSize: 18,
          color: colors.text,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: TAB_BAR_PADDING_BOTTOM + insets.bottom,
          paddingTop: 6,
        },
        tabBarIcon: ({ color, size }) => (
          <Icon source={TAB_ICONS[route.name] || 'circle'} size={size} color={color} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home', headerTitle: 'TrackVibe' }}
      />
      <Tab.Screen name="Body" component={BodyScreen} options={{ tabBarLabel: 'Body' }} />
      <Tab.Screen name="Energy" component={EnergyScreen} options={{ tabBarLabel: 'Energy' }} />
      <Tab.Screen name="Goals" component={GoalsScreen} options={{ tabBarLabel: 'Goals' }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarLabel: 'Insights' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}
