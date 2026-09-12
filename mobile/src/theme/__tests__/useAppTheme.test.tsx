import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accentHex } from '@trackvibe/shared/settings';
import { SETTINGS_STORAGE_KEY, SettingsProvider } from '../../context/SettingsContext';
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

  it('overrides only `primary` — every other role passes through the resolved base palette untouched', async () => {
    const { result } = await renderHook(() => useAppTheme(), { wrapper });

    const { primary: _primary, ...restOfDark } = darkColors;
    const { primary: _resolvedPrimary, ...restOfResolved } = result.current.colors;
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
  });

  it('builds a react-native-paper theme carrying the same resolved primary', async () => {
    const { result } = await renderHook(() => useAppTheme(), { wrapper });

    expect(result.current.paperTheme.colors.primary).toBe(result.current.colors.primary);
  });
});
