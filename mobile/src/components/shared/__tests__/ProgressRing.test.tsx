import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsProvider } from '../../../context/SettingsContext';
import { useSettings } from '../../../hooks/useSettings';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { darkColors, fonts, lightColors } from '../../../theme';
import { ProgressRing } from '../ProgressRing';

/**
 * The ring's unfilled track has been wrong twice, in opposite directions, and both times
 * silently:
 *
 *   1. A hardcoded '#e5e7eb' — frozen light-mode grey, 14.44:1 against the dark card. Loud,
 *      but at least visible, and the palette guard now forbids the shape entirely.
 *   2. `colors.surfaceMuted` — which READS like the web's `--muted` and is not it (it maps
 *      to `--paper-2`). 1.03:1 against the dark card, which ships as the default theme: the
 *      remainder disappears and the ring reads as complete at every value.
 *
 * The palette guard in theme/__tests__ catches (1) — a hex literal — and cannot catch (2),
 * because a wrong themed role is still a themed role. So this pins two things the guard
 * can't: that the track actually REPAINTS when the theme changes (nothing frozen), and that
 * it is the specific role chosen for contrast rather than whichever muted-sounding one came
 * to hand.
 *
 * It is now `muted` — the role the web's five ring tracks actually use — added to
 * `ColorRoles` for this, after a release on `border` as an interim. 1.19:1 dark / 1.17:1
 * light against the card. Any future move off it should recompute the contrast rather than
 * pick by name; that is how (2) happened.
 *
 * Note `await render(...)` and the raised timeout: same reasons as MobileGoalCard.test.tsx.
 */
jest.setTimeout(30_000);

beforeEach(async () => {
  await AsyncStorage.clear();
});

/** Flips the persisted theme setting, the way SettingsScreen's Appearance section does. */
function GoLight() {
  const { updateSettings } = useSettings();
  return (
    <Text style={{ fontFamily: fonts.regular }} onPress={() => updateSettings({ theme: 'light' })}>
      go-light
    </Text>
  );
}

const renderRing = () =>
  render(
    <SettingsProvider>
      <ThemeProvider>
        <ProgressRing value={20} />
        <GoLight />
      </ThemeProvider>
    </SettingsProvider>
  );

/**
 * react-native-svg does not keep `stroke` as the string it was given: it normalises the
 * colour into `{ type: 0, payload: <ARGB int> }`. Comparing the raw prop to a hex string
 * therefore never matches — and, worse, never matches a WRONG hex either, so a naive
 * `not.toBe('#e5e7eb')` would pass no matter what the component does. This puts it back
 * into a plain '#rrggbb' so the assertions mean something. Alpha is dropped; every
 * ColorRoles value is opaque.
 */
const strokeHex = (node: { props: { stroke?: unknown } }): string => {
  const stroke = node.props.stroke;
  if (typeof stroke === 'string') return stroke.toLowerCase();
  const payload = (stroke as { payload: number }).payload >>> 0;
  return `#${(payload & 0xffffff).toString(16).padStart(6, '0')}`;
};

describe('ProgressRing track colour', () => {
  it('repaints from the resolved palette when the theme changes, rather than being frozen', async () => {
    const r = await renderRing();

    // DEFAULT_SETTINGS.theme is 'dark' (packages/shared/src/settings/types.ts).
    expect(strokeHex(await r.findByTestId('progress-ring-track'))).toBe(darkColors.muted);

    fireEvent.press(await r.findByText('go-light'));

    // A hardcoded literal — the original bug — would still read the dark value here.
    expect(strokeHex(await r.findByTestId('progress-ring-track'))).toBe(lightColors.muted);
  });

  it('is not surfaceMuted, which is invisible against the card in the default theme', async () => {
    const r = await renderRing();

    const stroke = strokeHex(await r.findByTestId('progress-ring-track'));
    expect(stroke).not.toBe(darkColors.surfaceMuted);
    // And not the pre-fix literal either.
    expect(stroke).not.toBe('#e5e7eb');
  });
});
