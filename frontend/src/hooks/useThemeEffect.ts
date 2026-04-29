import { useEffect } from 'react';
import type { BalanceDisplayColor } from '@/types/settings';
import { ACCENT_PALETTE } from '@/lib/themePalette';

/**
 * Applies accent palette colors to CSS custom properties.
 * Supports light, dark, and system themes via ThemeProvider.
 */
export function useThemeEffect(_theme: unknown, accentColor: BalanceDisplayColor): void {
  useEffect(() => {
    const root = document.documentElement;
    const palette = ACCENT_PALETTE[accentColor];

    const applyPalette = () => {
      const isDark = root.classList.contains('dark');
      const primary = isDark ? palette.darkPrimary : palette.primary;
      const foreground = isDark ? palette.darkPrimaryForeground : palette.primaryForeground;
      root.style.setProperty('--primary', primary);
      root.style.setProperty('--primary-foreground', foreground);
      root.style.setProperty('--sidebar-primary', primary);
      root.style.setProperty('--sidebar-primary-foreground', foreground);
      root.style.setProperty('--ring', primary);
    };

    applyPalette();
    const observer = new MutationObserver(applyPalette);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [accentColor]);
}
