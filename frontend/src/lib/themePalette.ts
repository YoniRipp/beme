import type { BalanceDisplayColor } from '@/types/settings';

/**
 * HSL values for --primary and --primary-foreground per accent color.
 * Format: "H S% L%" (no "hsl()" wrapper; Tailwind/CSS use these with hsl(var(--primary))).
 */
export interface PrimaryPalette {
  primary: string;
  primaryForeground: string;
  darkPrimary: string;
  darkPrimaryForeground: string;
}

export const ACCENT_PALETTE: Record<BalanceDisplayColor, PrimaryPalette> = {
  green: {
    primary: '150 28% 30%',
    primaryForeground: '36 40% 98%',
    darkPrimary: '83 83% 64%',
    darkPrimaryForeground: '12 10% 5%',
  },
  blue: {
    primary: '212 58% 48%',
    primaryForeground: '0 0% 100%',
    darkPrimary: '206 100% 68%',
    darkPrimaryForeground: '12 10% 5%',
  },
  neutral: {
    primary: '30 14% 14%',
    primaryForeground: '36 40% 98%',
    darkPrimary: '138 10% 96%',
    darkPrimaryForeground: '12 10% 5%',
  },
  primary: {
    primary: '150 28% 30%',
    primaryForeground: '36 40% 98%',
    darkPrimary: '83 83% 64%',
    darkPrimaryForeground: '12 10% 5%',
  },
};
