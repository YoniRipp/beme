import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { BodyScreen } from '../screens/BodyScreen';
import { EnergyScreen } from '../screens/EnergyScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Icon } from 'react-native-paper';

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
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarLabelStyle: { fontSize: 10 },
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTitleStyle: { fontWeight: '600' },
        tabBarIcon: ({ color, size }) => (
          <Icon source={TAB_ICONS[route.name] || 'circle'} size={size} color={color} />
        ),
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home', headerTitle: 'BeMe' }}
      />
      <Tab.Screen name="Body" component={BodyScreen} options={{ tabBarLabel: 'Body' }} />
      <Tab.Screen name="Energy" component={EnergyScreen} options={{ tabBarLabel: 'Energy' }} />
      <Tab.Screen name="Goals" component={GoalsScreen} options={{ tabBarLabel: 'Goals' }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarLabel: 'Insights' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}
