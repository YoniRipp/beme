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
 * `useColorScheme()` reports `null` -- or, since RN 0.86, `'unspecified'` -- when the OS
 * scheme is unavailable (rather than throwing or guessing); the caller normalises both to
 * `null`, and that case falls back to the app default, dark, matching
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
 * `@trackvibe/shared/tokens`, with `primary` AND `primaryForeground` overridden by the
 * user's accent-colour choice (`settings.balanceDisplayColor`) — matching what
 * `useThemeEffect` does on the web (`frontend/src/hooks/useThemeEffect.ts`). That effect
 * is mounted unconditionally in `ProtectedAppRoutes` (`frontend/src/routes.tsx:90`) and
 * overwrites FIVE custom properties at runtime from `ACCENT_PALETTE[accentColor]`:
 * `--primary`, `--primary-foreground`, `--sidebar-primary`,
 * `--sidebar-primary-foreground` and `--ring`. Mobile has no sidebar and nothing reads
 * `--ring` today, so those three have no mobile counterpart — but `--primary-foreground`
 * is the half that makes the accent's own text legible, and it is overridden here too.
 * Every other role still comes straight from the resolved base palette.
 *
 * THE TRAP: with the shipped defaults (`theme: 'dark'`, `balanceDisplayColor: 'green'`)
 * this resolves `colors.primary` to `accentHex.green.darkPrimary` = `#b5ef57` (lime) —
 * NOT `darkColors.primary` (`#64c491`, sage). `frontend/src/index.css`'s `.dark` block
 * sets `--primary: var(--sage)`, but `useThemeEffect`'s runtime override wins on every
 * authenticated page, so lime is what the live site actually shows. Reading only
 * `darkColors.primary` here would make mobile sage where the site is lime. The same
 * trap applies to the foreground half: `darkColors.primaryForeground` (this base
 * palette's own near-black) is NOT what pairs with lime — `accentHex.green.darkPrimaryForeground`
 * is, and that is what must be read here, for the same reason.
 */
export function useAppTheme(): AppTheme {
  const { settings } = useSettings();
  const osScheme = useColorScheme();
  // React Native 0.86 widened `ColorSchemeName` to include `'unspecified'`, which `?? null`
  // does not catch. It means what `null` already meant here -- the OS reported no scheme --
  // so it is normalised at this boundary, keeping `resolveScheme` a pure function over the
  // app's own domain type rather than one that tracks React Native's.
  const osSchemeOrNull = osScheme === 'light' || osScheme === 'dark' ? osScheme : null;
  const scheme = resolveScheme(settings.theme, osSchemeOrNull);

  const basePalette = scheme === 'dark' ? darkColors : lightColors;
  const accent = accentHex[settings.balanceDisplayColor];
  const colors: ColorRoles = {
    ...basePalette,
    primary: scheme === 'dark' ? accent.darkPrimary : accent.primary,
    primaryForeground: scheme === 'dark' ? accent.darkPrimaryForeground : accent.primaryForeground,
  };

  const paperTheme = buildPaperTheme(scheme === 'dark' ? MD3DarkTheme : MD3LightTheme, colors);

  return { scheme, colors, paperTheme };
}
