import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces';
import { AuthProvider } from './src/context/AuthContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { ThemeProvider, useThemeContext } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { queryClient } from './src/lib/queryClient';

export default function App() {
  // The exact three family names `theme.ts` references (`Inter_400Regular`,
  // `Inter_500Medium`, `Fraunces_500Medium`) — see that file's own doc comment for why
  // those specific weights. Gated the same way `ThemeProvider` gates on
  // `settingsLoading` just below: render nothing until ready, so no screen ever paints
  // with the platform's system font and then reflows onto Inter/Fraunces a moment
  // later.
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Fraunces_500Medium,
  });

  if (!fontsLoaded) return null;

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
