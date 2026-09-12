import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from '@trackvibe/shared/settings';
import {
  SETTINGS_STORAGE_KEY,
  loadStoredSettings,
  mergeSettingsUpdate,
  persistSettings,
  SettingsProvider,
} from '../SettingsContext';
import { useSettings } from '../../hooks/useSettings';

// Mirrors frontend/src/context/AppContext.tsx semantics (merge-over-defaults on every
// read, partial-update persistence) with one deliberate divergence: AsyncStorage is
// async where localStorage is not, so SettingsProvider exposes `settingsLoading` and
// waits for the first read before anything theme-dependent renders.
//
// These tests exercise the plain functions SettingsContext.tsx exports, which is where
// the merge-over-defaults contract lives — the same pattern already used by
// `mergeExerciseEdits` in WorkoutFormScreen.tsx. The provider that wires them into React
// is covered separately at the bottom of this file.

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('loadStoredSettings', () => {
  it('resolves to DEFAULT_SETTINGS when storage is empty', async () => {
    await expect(loadStoredSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('merges a partial stored blob over the defaults', async () => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme: 'light' }));

    // Every field DEFAULT_SETTINGS defines but the stored blob omits must still be
    // present — this is what lets a blob written by an older build keep working.
    await expect(loadStoredSettings()).resolves.toEqual({ ...DEFAULT_SETTINGS, theme: 'light' });
  });

  it('falls back to defaults when storage holds corrupt JSON', async () => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, '{not valid json');

    await expect(loadStoredSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });
});

describe('updateSettings persistence (mergeSettingsUpdate + persistSettings + loadStoredSettings)', () => {
  it("persists updateSettings's merged result and reads it back on the next load (a remount)", async () => {
    const loaded = await loadStoredSettings();
    const next = mergeSettingsUpdate(loaded, { currency: 'EUR' });

    expect(next.currency).toBe('EUR');
    // Fields the update didn't touch survive untouched.
    expect(next.theme).toBe(DEFAULT_SETTINGS.theme);

    await persistSettings(next);

    // A remount is exactly a fresh call to loadStoredSettings: SettingsProvider's
    // mount effect calls this same function with no other state carried over.
    await expect(loadStoredSettings()).resolves.toEqual(next);
  });
});

// The provider itself, rendered for real. Until `test-renderer` (RNTL 14's missing
// peer) was installed, @testing-library/react-native could not even be imported, which
// is why the tests above exercise the exported plain functions instead. Those stay —
// they pin the storage semantics directly — but the wiring between them and React is
// what actually ships, so it gets its own test.
//
// Note `await render(...)`: RNTL 14 made render async for React 19 concurrent
// rendering. Without the await it returns a bare Promise and every query is undefined.
describe('SettingsProvider + useSettings', () => {
  function Probe() {
    const { settings, updateSettings, settingsLoading } = useSettings();
    if (settingsLoading) return <Text>loading</Text>;
    return (
      <>
        <Text>{`theme:${settings.theme}`}</Text>
        <Text>{`currency:${settings.currency}`}</Text>
        <Text onPress={() => updateSettings({ theme: 'light' })}>go-light</Text>
      </>
    );
  }

  const renderProbe = () =>
    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>
    );

  it('resolves settingsLoading and exposes the stored settings', async () => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ currency: 'EUR' }));

    const r = await renderProbe();

    expect(await r.findByText('currency:EUR')).toBeTruthy();
    // A field the stored blob omitted still comes through from DEFAULT_SETTINGS.
    expect(r.getByText(`theme:${DEFAULT_SETTINGS.theme}`)).toBeTruthy();
  });

  it('updateSettings through the hook persists, so a remount sees it', async () => {
    const r = await renderProbe();
    fireEvent.press(await r.findByText('go-light'));

    expect(await r.findByText('theme:light')).toBeTruthy();
    await expect(loadStoredSettings()).resolves.toMatchObject({ theme: 'light' });
  });
});
