import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accentHex } from '@trackvibe/shared/settings';
import type { BalanceDisplayColor } from '@trackvibe/shared/settings';
import { SETTINGS_STORAGE_KEY, SettingsProvider } from '../../context/SettingsContext';
import { useSettings } from '../../hooks/useSettings';
import { darkColors, lightColors } from '../../theme';
import { useAppTheme } from '../useAppTheme';

// Note `await renderHook(...)`: RNTL 14 made this async, same as `render()` — without
// the await, `result.current` reads before the hook has actually run.
//
// `SettingsProvider` initialises its state with DEFAULT_SETTINGS synchronously, before
// its AsyncStorage read resolves (mobile/src/context/SettingsContext.tsx), so a render
// against empty storage sees DEFAULT_SETTINGS from the very first render — no need to
// wait for the async load to exercise the default-settings case below.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useAppTheme', () => {
  it(
    "THE TRAP: with default settings (theme 'dark', accent 'green'), primary is the web's " +
      "runtime-overridden lime (#b5ef57) — not darkColors.primary's sage (#64c491)",
    async () => {
      const { result } = await renderHook(() => useAppTheme(), { wrapper });

      expect(result.current.scheme).toBe('dark');
      expect(result.current.colors.primary).toBe('#b5ef57');
      expect(result.current.colors.primary).toBe(accentHex.green.darkPrimary);
      // Pin the regression this whole task exists to prevent: reading the base dark
      // palette's own `primary` gives sage, the wrong answer for what the live site
      // actually renders.
      expect(result.current.colors.primary).not.toBe(darkColors.primary);
    }
  );

  it('overrides BOTH `primary` and `primaryForeground` — every other role passes through the resolved base palette untouched', async () => {
    const { result } = await renderHook(() => useAppTheme(), { wrapper });

    // This test used to assert only `primary` was overridden — the same wrong belief
    // the docblock stated ("useThemeEffect... never touches any other custom
    // property"). The web actually sets FIVE custom properties together
    // (frontend/src/hooks/useThemeEffect.ts:18-22): `--primary`, `--primary-foreground`,
    // `--sidebar-primary`, `--sidebar-primary-foreground`, `--ring`. Mobile has no
    // sidebar and nothing reads `--ring`, but `--primary-foreground` is the half that
    // makes the accent's own text legible, so it must be overridden here too.
    expect(result.current.colors.primary).toBe(accentHex.green.darkPrimary);
    expect(result.current.colors.primaryForeground).toBe(accentHex.green.darkPrimaryForeground);
    // Pin the same class of regression as the first test above: reading the base dark
    // palette's own `primaryForeground` is the wrong answer for what pairs with the
    // accent-overridden `primary`.
    expect(result.current.colors.primaryForeground).not.toBe(darkColors.primaryForeground);

    const { primary: _primary, primaryForeground: _primaryForeground, ...restOfDark } = darkColors;
    const { primary: _resolvedPrimary, primaryForeground: _resolvedForeground, ...restOfResolved } = result.current.colors;
    expect(restOfResolved).toEqual(restOfDark);
  });

  it("applies the light-mode equivalent of the accent override when settings.theme is 'light'", async () => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme: 'light' }));

    const { result } = await renderHook(() => useAppTheme(), { wrapper });

    // SettingsProvider starts from DEFAULT_SETTINGS and only picks up the stored
    // `theme: 'light'` once its AsyncStorage read resolves — retry until it does.
    await waitFor(() => expect(result.current.scheme).toBe('light'));

    expect(result.current.colors.primary).toBe(accentHex.green.primary);
    // `ACCENT_PALETTE.green.primary` was chosen to already equal the light palette's
    // own default primary (see packages/shared/src/settings/accent.ts), so this is the
    // one case where the override is a no-op — worth pinning explicitly so a future
    // change to either constant is caught here.
    expect(result.current.colors.primary).toBe(lightColors.primary);

    expect(result.current.colors.primaryForeground).toBe(accentHex.green.primaryForeground);
    expect(result.current.colors.primaryForeground).toBe(lightColors.primaryForeground);
  });

  it('builds a react-native-paper theme carrying the same resolved primary', async () => {
    const { result } = await renderHook(() => useAppTheme(), { wrapper });

    expect(result.current.paperTheme.colors.primary).toBe(result.current.colors.primary);
  });
});

/**
 * The assertion that would have caught the bug this whole task exists to fix. A test
 * that merely checks `primaryForeground` is "set" (e.g. `.toBeDefined()`, or comparing
 * against a hardcoded hex) would not have — `accentHex.*.primaryForeground` /
 * `darkPrimaryForeground` already existed and were already correct (see
 * `packages/shared/src/settings/accent.ts`) the entire time this was broken; the bug was
 * that `useAppTheme` never read them. The only assertion that actually distinguishes
 * "reads the real foreground" from "reads nothing / reads the wrong thing" is a numeric
 * contrast check against whatever `useAppTheme()` ACTUALLY resolves — so this renders the
 * real hook, for every accent, in both schemes, and computes WCAG contrast from whatever
 * hex comes back. No expected hex is hardcoded anywhere below.
 */
describe('useAppTheme primaryForeground contrast', () => {
  // WCAG 2.x relative luminance / contrast ratio — https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
  // and https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio. Implemented locally rather than
  // imported so this test has no dependency on any implementation under test.
  function srgbChannelToLinear(channel255: number): number {
    const c = channel255 / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 0.2126 * srgbChannelToLinear(r) + 0.7152 * srgbChannelToLinear(g) + 0.0722 * srgbChannelToLinear(b);
  }

  /** Order-independent WCAG contrast ratio, from 1 (identical) to 21 (black vs white). */
  function contrastRatio(hexA: string, hexB: string): number {
    const lighter = Math.max(relativeLuminance(hexA), relativeLuminance(hexB));
    const darker = Math.min(relativeLuminance(hexA), relativeLuminance(hexB));
    return (lighter + 0.05) / (darker + 0.05);
  }

  const accents = Object.keys(accentHex) as BalanceDisplayColor[];
  const schemes = ['light', 'dark'] as const;
  const cases = accents.flatMap((accent) => schemes.map((theme) => ({ accent, theme })));

  it.each(cases)(
    'primaryForeground on primary meets WCAG AA (>= 4.5:1) — accent=$accent, theme=$theme',
    async ({ accent, theme }) => {
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ theme, balanceDisplayColor: accent })
      );

      // Wait on `settingsLoading`, not on `colors`/`scheme` — for combinations that
      // happen to match DEFAULT_SETTINGS (theme 'dark', accent 'green'), `scheme` never
      // changes from its initial value, so waiting on it would resolve before the
      // AsyncStorage-loaded `balanceDisplayColor` has actually taken effect.
      const { result } = await renderHook(
        () => ({ theme: useAppTheme(), settings: useSettings() }),
        { wrapper }
      );
      await waitFor(() => expect(result.current.settings.settingsLoading).toBe(false));

      const { colors } = result.current.theme;
      const ratio = contrastRatio(colors.primary, colors.primaryForeground);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  );
});
