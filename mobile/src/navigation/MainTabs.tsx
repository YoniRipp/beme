import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { BodyScreen } from '../screens/BodyScreen';
import { EnergyScreen } from '../screens/EnergyScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Icon } from 'react-native-paper';
import { useThemeContext } from '../theme/ThemeContext';
import { fonts } from '../theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: 'home',
  Body: 'dumbbell',
  Energy: 'lightning-bolt',
  Goals: 'target',
  Insights: 'chart-line',
  Settings: 'cog',
};

export function MainTabs() {
  const { colors } = useThemeContext();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
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
          height: 64,
          paddingBottom: 8,
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
