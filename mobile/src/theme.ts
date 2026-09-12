import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { lightColors, darkColors, colors, spacing, radii } from '@trackvibe/shared/tokens';

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

export const paperTheme = {
  ...MD3LightTheme,
  roundness: radius.md,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.food,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceMuted,
    outline: colors.border,
    onSurface: colors.text,
    onSurfaceVariant: colors.textMuted,
    error: colors.danger,
  },
};

export const paperDarkTheme = {
  ...MD3DarkTheme,
  roundness: radius.md,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary,
    secondary: darkColors.food,
    background: darkColors.background,
    surface: darkColors.surface,
    surfaceVariant: darkColors.surfaceMuted,
    outline: darkColors.border,
    onSurface: darkColors.text,
    onSurfaceVariant: darkColors.textMuted,
    error: darkColors.danger,
  },
};
