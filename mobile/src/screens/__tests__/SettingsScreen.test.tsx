import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from '../../context/AuthContext';
import { loadStoredSettings, SettingsProvider } from '../../context/SettingsContext';
import { ThemeProvider } from '../../theme/ThemeContext';
import { SETTINGS_SECTION_TITLES, SettingsScreen } from '../SettingsScreen';

// Three defects fixed here, all verified against the web (frontend/src/pages/Settings.tsx):
//
// 1. The kg/lbs radio was local `useState` (never persisted, reset on remount). Replaced
//    with metric/imperial, persisted through `useSettings()` — matching
//    `frontend/src/components/settings/UnitsSection.tsx`.
// 2. The notifications switch persisted nothing and has no web counterpart at all —
//    removed, the same call already made for the "Data" section in the prior phase.
// 3. There was no Appearance section. Added, matching
//    `frontend/src/components/settings/AppearanceSection.tsx`: a light/dark/system theme
//    selector and the four-option accent colour picker (`BALANCE_DISPLAY_COLORS`).
//
// Note `await render(...)`: RNTL 14 made render async — without the await every query on
// the result comes back undefined (see `SettingsContext.test.tsx` for the same note).

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('SettingsScreen sections', () => {
  it('does not offer a Data section for the Clear All Data control that deleted nothing', () => {
    expect(SETTINGS_SECTION_TITLES).not.toContain('Data');
  });

  it('does not offer a Notifications section for the switch that persisted nothing and had no web counterpart', () => {
    expect(SETTINGS_SECTION_TITLES).not.toContain('Notifications');
  });

  it("offers exactly the sections that are real, working settings, in the web's order", () => {
    expect(SETTINGS_SECTION_TITLES).toEqual(['Account', 'Units', 'Appearance']);
  });
});

function renderScreen() {
  return render(
    <SettingsProvider>
      <ThemeProvider>
        <AuthProvider>
          <SettingsScreen />
        </AuthProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}

describe('Units section', () => {
  it('persists the selected unit system through useSettings, replacing the old unpersisted local state', async () => {
    const r = await renderScreen();

    fireEvent.press(await r.findByText('Imperial (lbs, in)'));

    await expect(loadStoredSettings()).resolves.toMatchObject({ units: 'imperial' });
  });

  it('no longer offers the kg/lbs vocabulary mobile invented', async () => {
    const r = await renderScreen();

    await r.findByText('Metric (kg, cm)');
    expect(r.queryByText('Kilograms (kg)')).toBeNull();
    expect(r.queryByText('Pounds (lbs)')).toBeNull();
  });
});

describe('Notifications section', () => {
  it('renders no notifications control at all', async () => {
    const r = await renderScreen();

    await r.findByText('Account');
    expect(r.queryByText('Push Notifications')).toBeNull();
    expect(r.queryByText('Notifications')).toBeNull();
  });
});

describe('Appearance section', () => {
  it('persists the selected theme through useSettings', async () => {
    const r = await renderScreen();

    fireEvent.press(await r.findByText('Light'));

    await expect(loadStoredSettings()).resolves.toMatchObject({ theme: 'light' });
  });

  it('persists the selected accent colour through useSettings', async () => {
    const r = await renderScreen();

    fireEvent.press(await r.findByText('Blue'));

    await expect(loadStoredSettings()).resolves.toMatchObject({ balanceDisplayColor: 'blue' });
  });
});
