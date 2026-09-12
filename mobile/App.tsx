import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { ThemeProvider, useThemeContext } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

/**
 * Split out from `App` because `ThemeProvider` needs `useSettings()`
 * (`mobile/src/context/SettingsContext.tsx`), which only works below `SettingsProvider`
 * — and `App` itself is the component that mounts `SettingsProvider`, so it can't call
 * that hook (or `useThemeContext`) directly. `ThemeProvider` already resolves
 * `PaperProvider` internally; this is everything that used to sit inside it.
 */
function AppShell() {
  const { scheme } = useThemeContext();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
        {/* Drives the status bar glyphs from the resolved scheme instead of the OS —
            "auto" followed the OS regardless of the in-app theme setting, which is
            exactly the mismatch this task fixes (see the ledger's baseline capture). */}
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Toast />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
