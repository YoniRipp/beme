import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsProvider } from '../../context/SettingsContext';
import { useSettings } from '../../hooks/useSettings';
import { ThemeProvider } from '../ThemeContext';
import { useThemedStyles } from '../useThemedStyles';
import { lightColors, darkColors } from '../../theme';

// This is the regression Task 4 exists to prevent: `StyleSheet.create` runs exactly
// once, at module load, so a stylesheet built from a *static* `colors` import can
// never repaint when the theme changes — no matter what `ThemeProvider` resolves.
// `useThemedStyles` fixes this by calling `StyleSheet.create` inside the component,
// from `useThemeContext()`'s resolved palette. If that ever regressed back to a
// module-scope sheet, this test would keep showing the *first* palette forever.
//
// Note `await render(...)`/`fireEvent`: same RNTL 14 note as the other theme tests —
// `render` is async now.

beforeEach(async () => {
  await AsyncStorage.clear();
});

function Probe() {
  const { updateSettings } = useSettings();
  const styles = useThemedStyles((colors) => ({
    box: { backgroundColor: colors.surface },
  }));

  return (
    <>
      <Text>{`bg:${styles.box.backgroundColor}`}</Text>
      <Text onPress={() => updateSettings({ theme: 'light' })}>go-light</Text>
    </>
  );
}

describe('useThemedStyles', () => {
  it('rebuilds the stylesheet from the resolved palette when the theme setting changes', async () => {
    const r = await render(
      <SettingsProvider>
        <ThemeProvider>
          <Probe />
        </ThemeProvider>
      </SettingsProvider>
    );

    // DEFAULT_SETTINGS.theme is 'dark' (packages/shared/src/settings/types.ts), so the
    // first render must already reflect the dark palette, not just eventually.
    expect(await r.findByText(`bg:${darkColors.surface}`)).toBeTruthy();

    fireEvent.press(await r.findByText('go-light'));

    // A stylesheet frozen at first render would still read `darkColors.surface` here.
    expect(await r.findByText(`bg:${lightColors.surface}`)).toBeTruthy();
  });
});
