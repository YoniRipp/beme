import React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { MainTabs } from './MainTabs';
import { WorkoutFormScreen } from '../screens/WorkoutFormScreen';
import { FoodEntryFormScreen } from '../screens/FoodEntryFormScreen';
import { SleepFormScreen } from '../screens/SleepFormScreen';
import { GoalFormScreen } from '../screens/GoalFormScreen';
import { WeightFormScreen } from '../screens/WeightFormScreen';
import { View, Text, ActivityIndicator } from 'react-native';
import { fonts } from '../theme';
import { useThemeContext } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  const { colors } = useThemeContext();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        // Same app bar title as the tab screens — `Base44Layout.tsx:228`, Fraunces 600 at 18.
        headerTitleStyle: {
          color: colors.text,
          fontFamily: fonts.displaySemibold,
          fontWeight: '600',
          fontSize: 18,
        },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
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
      <Stack.Screen
        name="WeightForm"
        component={WeightFormScreen}
        options={{ title: 'Log Weight', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

function LoadingScreen() {
  const styles = useThemedStyles((colors) => ({
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      fontFamily: fonts.regular,
      color: colors.textMuted,
    },
  }));

  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

/**
 * Builds a react-navigation theme matching the app's resolved scheme, layered over
 * react-navigation's own `DarkTheme`/`DefaultTheme` (Task 3 Step 4) — Paper's
 * `PaperProvider` (mounted in `ThemeContext.tsx`) does not theme `NavigationContainer`
 * chrome (screen background during transitions, the native back-gesture edge), so it
 * needs its own theme object rather than inheriting Paper's.
 */
function buildNavigationTheme(scheme: 'light' | 'dark', palette: { primary: string; background: string; surface: string; text: string; border: string; danger: string }): NavigationTheme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.danger,
    },
  };
}

export function RootNavigator() {
  const { user, authLoading } = useAuth();
  const { scheme, colors: resolvedColors } = useThemeContext();

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={buildNavigationTheme(scheme, resolvedColors)}>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
