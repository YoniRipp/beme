import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from '@trackvibe/shared/settings';
import {
  SETTINGS_STORAGE_KEY,
  loadStoredSettings,
  mergeSettingsUpdate,
  persistSettings,
} from '../SettingsContext';

// Mirrors frontend/src/context/AppContext.tsx semantics (merge-over-defaults on every
// read, partial-update persistence) with one deliberate divergence: AsyncStorage is
// async where localStorage is not, so SettingsProvider exposes `settingsLoading` and
// waits for the first read before anything theme-dependent renders.
//
// These tests exercise the plain functions SettingsContext.tsx exports for exactly
// this reason: this project's jest setup does not wire up react-native component
// rendering (see the comment in SettingsScreen.tsx), so `SettingsProvider` and
// `useSettings` are kept as thin React wrappers around logic that is unit-testable
// on its own, the same pattern already used by `mergeExerciseEdits` in
// WorkoutFormScreen.tsx and `SETTINGS_SECTION_TITLES` in SettingsScreen.tsx.

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
