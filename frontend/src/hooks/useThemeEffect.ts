import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import type { BalanceDisplayColor } from '@/types/settings';
import { ACCENT_PALETTE } from '@/lib/themePalette';

/**
 * Syncs light theme to next-themes and applies accent palette to --primary/--primary-foreground.
 * Use in a single place (e.g. ProtectedAppRoutes) so theme is applied once per app.
 */
export function useThemeEffect(_theme: string, accentColor: BalanceDisplayColor): void {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    const palette = ACCENT_PALETTE[accentColor].light;
    root.style.setProperty('--primary', palette.primary);
    root.style.setProperty('--primary-foreground', palette.primaryForeground);
    root.style.setProperty('--sidebar-primary', palette.primary);
    root.style.setProperty('--sidebar-primary-foreground', palette.primaryForeground);
  }, [accentColor]);
}
