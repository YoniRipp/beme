import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { MainTabs } from './MainTabs';
import { WorkoutFormScreen } from '../screens/WorkoutFormScreen';
import { FoodEntryFormScreen } from '../screens/FoodEntryFormScreen';
import { SleepFormScreen } from '../screens/SleepFormScreen';
import { GoalFormScreen } from '../screens/GoalFormScreen';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="WorkoutForm"
        component={WorkoutFormScreen}
        options={{ title: 'Workout', presentation: 'modal' }}
      />
      <Stack.Screen
        name="FoodEntryForm"
        component={FoodEntryFormScreen}
        options={{ title: 'Food Entry', presentation: 'modal' }}
      />
      <Stack.Screen
        name="SleepForm"
        component={SleepFormScreen}
        options={{ title: 'Log Sleep', presentation: 'modal' }}
      />
      <Stack.Screen
        name="GoalForm"
        component={GoalFormScreen}
        options={{ title: 'Goal', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

export function RootNavigator() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
