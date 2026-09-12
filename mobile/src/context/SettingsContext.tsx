import React, { createContext, useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, DEFAULT_SETTINGS } from '@trackvibe/shared/settings';

// Mirrors frontend/src/context/AppContext.tsx: same storage key, same
// merge-over-DEFAULT_SETTINGS semantics, same partial-update contract. The one
// deliberate divergence is that AsyncStorage is async where localStorage is not, so
// this also exposes `settingsLoading` — consumers must wait for it to go false
// before rendering anything theme-dependent, or the app flashes the default theme
// before snapping to the stored one.

export const SETTINGS_STORAGE_KEY = 'trackvibe_settings';

export interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  settingsLoading: boolean;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * Reads the stored settings blob and always merges it over DEFAULT_SETTINGS, so a
 * blob written by an older build that lacks a field still works. Corrupt JSON (or
 * any read failure) falls back to the defaults rather than throwing.
 *
 * Exported as a plain function — rather than inlined in a useEffect — so the storage
 * semantics can be pinned directly, without a render. The provider is covered by its
 * own rendered test as well; both matter, because this function is where the
 * merge-over-defaults contract lives.
 */
export async function loadStoredSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.error(`Error loading ${SETTINGS_STORAGE_KEY} from AsyncStorage:`, error);
    return DEFAULT_SETTINGS;
  }
}

/** Merges a partial update over the current settings, always re-anchored on DEFAULT_SETTINGS. */
export function mergeSettingsUpdate(
  current: AppSettings,
  updates: Partial<AppSettings>
): AppSettings {
  return { ...DEFAULT_SETTINGS, ...current, ...updates };
}

/** Persists a full settings object. Failures are logged, not thrown — same posture as the web. */
export async function persistSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error(`Error saving ${SETTINGS_STORAGE_KEY} to AsyncStorage:`, error);
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadStoredSettings().then((loaded) => {
      if (cancelled) return;
      setSettings(loaded);
      setSettingsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = mergeSettingsUpdate(prev, updates);
      void persistSettings(next);
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, settingsLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}
