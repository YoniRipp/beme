import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { lightColors, darkColors, colors, spacing, radii, type ColorRoles } from '@trackvibe/shared/tokens';

/**
 * Design tokens now live in `@trackvibe/shared/tokens` (task 11), transcribed from
 * the web client's CSS custom properties (`frontend/src/index.css`) so both clients
 * draw from one palette instead of two hand-maintained hex lists. Re-exported here
 * under their original names so every existing import site
 * (`import { colors, spacing, radius } from '../theme'`, etc.) keeps working
 * unchanged — this file is now a thin adapter from the shared tokens to
 * `react-native-paper`'s theme shape, not a second source of colour values.
 */
export { lightColors, darkColors, colors, spacing };

// `radius` is the name every mobile screen already imports; `radii` is the shared
// package's name for the same scale (see packages/shared/src/tokens/spacing.ts).
export const radius = radii;

/**
 * Maps a `ColorRoles` palette onto a react-native-paper MD3 theme, layered over a base
 * (`MD3LightTheme`/`MD3DarkTheme`) so every MD3 role this doesn't touch keeps Paper's
 * own default. Extracted (task 3) so the static `paperTheme`/`paperDarkTheme` below and
 * `theme/useAppTheme.ts`'s runtime-resolved theme — same base palettes, but with
 * `primary` swapped for the user's accent-colour choice — share one mapping instead of
 * two copies that can drift apart.
 */
export function buildPaperTheme(base: MD3Theme, palette: ColorRoles): MD3Theme {
  return {
    ...base,
    roundness: radius.md,
    colors: {
      ...base.colors,
      primary: palette.primary,
      secondary: palette.food,
      background: palette.background,
      surface: palette.surface,
      surfaceVariant: palette.surfaceMuted,
      outline: palette.border,
      onSurface: palette.text,
      onSurfaceVariant: palette.textMuted,
      error: palette.danger,
    },
  };
}

export const paperTheme = buildPaperTheme(MD3LightTheme, colors);
export const paperDarkTheme = buildPaperTheme(MD3DarkTheme, darkColors);
