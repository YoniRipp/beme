import { useEffect } from 'react';
import type { BalanceDisplayColor } from '@/types/settings';
import { ACCENT_PALETTE } from '@/lib/themePalette';

/**
 * Applies accent palette colors to CSS custom properties.
 * Theme is always light (forced via ThemeProvider).
 */
export function useThemeEffect(_theme: unknown, accentColor: BalanceDisplayColor): void {
  useEffect(() => {
    const root = document.documentElement;
    const palette = ACCENT_PALETTE[accentColor];
    root.style.setProperty('--primary', palette.primary);
    root.style.setProperty('--primary-foreground', palette.primaryForeground);
    root.style.setProperty('--sidebar-primary', palette.primary);
    root.style.setProperty('--sidebar-primary-foreground', palette.primaryForeground);
  }, [accentColor]);
}
