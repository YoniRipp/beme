import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const lightColors = {
  background: '#f8f5ef',
  surface: '#ffffff',
  surfaceMuted: '#f1ece4',
  text: '#241f1b',
  textMuted: '#766d64',
  border: '#e4ddd3',
  primary: '#375f46',
  primarySoft: '#e8f1eb',
  food: '#c96145',
  foodSoft: '#f8e7e1',
  workout: '#3f7fbf',
  workoutSoft: '#e6f0fa',
  sleep: '#c4922d',
  sleepSoft: '#f8efd8',
  danger: '#d64545',
  success: '#3c8a63',
};

export const darkColors = {
  background: '#0f1110',
  surface: '#171b18',
  surfaceMuted: '#20261f',
  text: '#f4f7f2',
  textMuted: '#9aa39a',
  border: '#2b332c',
  primary: '#baf45a',
  primarySoft: '#26351d',
  food: '#ff805c',
  foodSoft: '#341f1a',
  workout: '#66b7ff',
  workoutSoft: '#142636',
  sleep: '#ffd45f',
  sleepSoft: '#352a14',
  danger: '#f87171',
  success: '#70d79a',
};

export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
};

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
