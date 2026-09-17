import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// Per-weight subpaths, never the package root. `@expo-google-fonts/inter/index.js` is a
// barrel that `require()`s all 18 Inter weights, and Metro cannot tree-shake a `require` of
// an asset -- so importing six names from the root shipped all 36 Inter and Fraunces faces,
// italics included, in the binary. Measured with `npx expo export --platform ios`.
// Each weight directory exports only its own file, which is why these are directories and
// not the flat names. `useFonts` comes from `expo-font`, which the root barrel re-exports
// anyway; importing it from there would pull the whole barrel back in.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { AuthProvider } from './src/context/AuthContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { ThemeProvider, useThemeContext } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './src/components/shared/ErrorBoundary';
import Toast from 'react-native-toast-message';
import { queryClient } from './src/lib/queryClient';

export default function App() {
  // The exact three family names `theme.ts` references (`Inter_400Regular`,
  // `Inter_500Medium`, `Fraunces_500Medium`) — see that file's own doc comment for why
  // those specific weights. Gated the same way `ThemeProvider` gates on
  // `settingsLoading` just below: render nothing until ready, so no screen ever paints
  // with the platform's system font and then reflows onto Inter/Fraunces a moment
  // later.
  //
  // Six faces, not three. `mobile/src` named `600`, `700` and `800` in 52 of its 55
  // `fontWeight` declarations while only 400 and 500 were loaded — and on Expo a weight is a
  // family name, not a number, so none of those 52 could render what they asked for.
  //
  // **There is deliberately no 800 face.** The web's `font-extrabold` (34 usages) is itself
  // unbacked: `frontend/index.html` requests Inter at `wght@300;400;500;600;700`, so the
  // browser is synthesising or clamping it. Loading a real `Inter_800ExtraBold` would make
  // this client HEAVIER than the reference it is matching. 800 maps to `fonts.bold` instead,
  // and whether the web adds 800 or drops to `font-bold` is a web-side decision.
  //
  // No new packages: the extra weights ship inside `@expo-google-fonts/inter` and
  // `/fraunces`, which are asset-only with no native module — so Expo Go still works.
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    // Outermost, so it also catches a throw from the providers themselves. A render error
    // anywhere below here unmounts the React Native root and leaves a blank screen with
    // nothing to tap; this is what stands between that and the user.
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <ThemeProvider>
            <AppShell />
          </ThemeProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
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
