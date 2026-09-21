import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Pressable, View } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { BodyScreen } from '../screens/BodyScreen';
import { EnergyScreen } from '../screens/EnergyScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VoiceSheet } from '../components/voice/VoiceSheet';
import { useThemeContext } from '../theme/ThemeContext';
import { fonts, spacing } from '../theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: 'home',
  Body: 'dumbbell',
  Energy: 'fire',
  Settings: 'account',
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

/**
 * The centre voice button, mirroring `BottomNavigation.tsx` on the web: a 60px circle that
 * rises 22px clear of the bar's top edge, so 38px of it overlaps the bar.
 *
 * Geometry rather than a magic number: the bar's own height already tracks the gesture-bar
 * inset, so the button is offset from THAT and the two cannot drift apart on a device with a
 * different inset — which is the bug the tab bar itself had.
 */
/** The docked coach button: `--dock-size` / `--dock-gap` on the web. */
const DOCK_SIZE = 44;
const DOCK_GAP = 12;
const FAB_SIZE = 60;
const FAB_RISE = 22;

export function MainTabs() {
  const navigation = useNavigation<any>();
  const { colors } = useThemeContext();
  const insets = useSafeAreaInsets();

  const [voiceOpen, setVoiceOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
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
      <Tab.Screen name="Body" component={BodyScreen} options={{ tabBarLabel: 'Workouts' }} />
      <Tab.Screen name="Energy" component={EnergyScreen} options={{ tabBarLabel: 'Food' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open voice"
        onPress={() => setVoiceOpen(true)}
        style={{
          position: 'absolute',
          alignSelf: 'center',
          bottom: TAB_BAR_HEIGHT + insets.bottom - (FAB_SIZE - FAB_RISE),
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: FAB_SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primary,
          // The web rings the button in the page background so it punches cleanly out of
          // the bar rather than merging with it.
          borderWidth: 3,
          borderColor: colors.background,
        }}
      >
        <Icon source="microphone" size={26} color={colors.primaryForeground} />
      </Pressable>
      {/*
        The AI coach, docked above the bar's right edge — `BottomNavigation.tsx`'s
        `showAiCoach` button, in the same relationship to the bar.

        Deliberately not a tab. The web's own note explains why in behavioural terms: AI
        access is conditional, so a tab would appear and disappear as a user's monthly
        allowance ran out and shift the four fixed tabs under their thumb. Secondary chrome
        beside the primary mic, so it takes the surface colour rather than the accent.
      */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open AI Coach"
        onPress={() => navigation.navigate('Chat')}
        style={{
          position: 'absolute',
          right: spacing.lg,
          bottom: TAB_BAR_HEIGHT + insets.bottom + DOCK_GAP,
          width: DOCK_SIZE,
          height: DOCK_SIZE,
          borderRadius: DOCK_SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.text,
          borderWidth: 3,
          borderColor: colors.background,
        }}
      >
        <Icon source="auto-fix" size={20} color={colors.background} />
      </Pressable>
      <VoiceSheet visible={voiceOpen} onDismiss={() => setVoiceOpen(false)} />
    </View>
  );
}
