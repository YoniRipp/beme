import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { accentHex, type Theme as ThemeSetting } from '@trackvibe/shared/settings';
import type { ColorRoles } from '@trackvibe/shared/tokens';
import { useSettings } from '../hooks/useSettings';
import { buildPaperTheme, darkColors, lightColors } from '../theme';

export type Scheme = 'light' | 'dark';

/**
 * Resolves the effective color scheme from the user's `theme` setting and the OS
 * scheme React Native reports.
 *
 * Mirrors next-themes' semantics on the web: `ThemeProvider` is mounted with
 * `defaultTheme="dark" enableSystem` (`frontend/src/App.tsx:14`). 'light'/'dark' pin
 * the scheme regardless of the OS; 'system' defers to it. React Native's
 * `useColorScheme()` reports `null` when the OS scheme is unavailable (rather than
 * throwing or guessing) — that case falls back to the app default, dark, matching
 * `DEFAULT_SETTINGS.theme` (`packages/shared/src/settings/types.ts`).
 */
export function resolveScheme(themeSetting: ThemeSetting, osScheme: 'light' | 'dark' | null): Scheme {
  if (themeSetting === 'system') {
    return osScheme ?? 'dark';
  }
  return themeSetting;
}

export interface AppTheme {
  scheme: Scheme;
  colors: ColorRoles;
  paperTheme: MD3Theme;
}

/**
 * Resolves the app's active theme: the base light/dark palette from
 * `@trackvibe/shared/tokens`, with `primary` overridden by the user's accent-colour
 * choice (`settings.balanceDisplayColor`) — matching what `useThemeEffect` does on the
 * web (`frontend/src/hooks/useThemeEffect.ts`). That effect is mounted unconditionally
 * in `ProtectedAppRoutes` (`frontend/src/routes.tsx:90`) and overwrites `--primary` at
 * runtime with `ACCENT_PALETTE[accentColor]`; it never touches any other custom
 * property, so only `colors.primary` is overridden here — every other role comes
 * straight from the resolved base palette.
 *
 * THE TRAP: with the shipped defaults (`theme: 'dark'`, `balanceDisplayColor: 'green'`)
 * this resolves `colors.primary` to `accentHex.green.darkPrimary` = `#b5ef57` (lime) —
 * NOT `darkColors.primary` (`#64c491`, sage). `frontend/src/index.css`'s `.dark` block
 * sets `--primary: var(--sage)`, but `useThemeEffect`'s runtime override wins on every
 * authenticated page, so lime is what the live site actually shows. Reading only
 * `darkColors.primary` here would make mobile sage where the site is lime.
 */
export function useAppTheme(): AppTheme {
  const { settings } = useSettings();
  const osScheme = useColorScheme();
  const scheme = resolveScheme(settings.theme, osScheme ?? null);

  const basePalette = scheme === 'dark' ? darkColors : lightColors;
  const accent = accentHex[settings.balanceDisplayColor];
  const colors: ColorRoles = {
    ...basePalette,
    primary: scheme === 'dark' ? accent.darkPrimary : accent.primary,
  };

  const paperTheme = buildPaperTheme(scheme === 'dark' ? MD3DarkTheme : MD3LightTheme, colors);

  return { scheme, colors, paperTheme };
}
