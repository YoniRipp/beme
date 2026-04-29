import { MD3LightTheme } from 'react-native-paper';

export const colors = {
  background: '#f8f5ef',
  surface: '#ffffff',
  surfaceMuted: '#f1ece4',
  text: '#241f1b',
  textMuted: '#766d64',
  border: '#e4ddd3',
  primary: '#3f6f55',
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
