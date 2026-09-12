import React, { createContext, useContext } from 'react';
import { PaperProvider } from 'react-native-paper';
import { useSettings } from '../hooks/useSettings';
import { useAppTheme, type AppTheme } from './useAppTheme';

const ThemeContext = createContext<AppTheme | undefined>(undefined);

/**
 * Mounts the resolved theme for the whole app.
 *
 * Gates rendering on `settingsLoading` (`mobile/src/context/SettingsContext.tsx`):
 * until the first AsyncStorage read resolves, the user's actual theme setting isn't
 * known yet, and `SettingsProvider` is reporting `DEFAULT_SETTINGS` as a placeholder.
 * Rendering theme-dependent UI against that placeholder would paint the default theme
 * and then snap to the real one a moment later — the exact flash this phase exists to
 * remove — so this renders nothing until settings have loaded.
 *
 * Once ready, wraps `children` in `PaperProvider` with the resolved paper theme (Task 3
 * Step 4), and re-provides `{ scheme, colors, paperTheme }` via context so components
 * outside Paper's own theming can read the same resolved values — chiefly
 * `RootNavigator`'s `NavigationContainer`, which Paper does not theme, and which needs
 * `scheme`/`colors` to build a matching navigation theme.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settingsLoading } = useSettings();
  const theme = useAppTheme();

  if (settingsLoading) return null;

  return (
    <ThemeContext.Provider value={theme}>
      <PaperProvider theme={theme.paperTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}

/** Consumes the theme resolved by `ThemeProvider`. Must be called under it. */
export function useThemeContext(): AppTheme {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return ctx;
}
