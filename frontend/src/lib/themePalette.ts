import type { BalanceDisplayColor } from '@/types/settings';

/**
 * HSL values for --primary and --primary-foreground per accent color.
 * Format: "H S% L%" (no "hsl()" wrapper; Tailwind/CSS use these with hsl(var(--primary))).
 */
export interface PrimaryPalette {
  primary: string;
  primaryForeground: string;
}

export const ACCENT_PALETTE: Record<BalanceDisplayColor, PrimaryPalette> = {
  green: { primary: '138 15% 54%', primaryForeground: '0 0% 100%' },
  blue: { primary: '221 83% 53%', primaryForeground: '0 0% 100%' },
  neutral: { primary: '222.2 47.4% 11.2%', primaryForeground: '210 40% 98%' },
  primary: { primary: '262 83% 58%', primaryForeground: '0 0% 100%' },
};
