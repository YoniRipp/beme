import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../context/AuthContext';
import { loadStoredSettings, SettingsProvider } from '../../context/SettingsContext';
import { ThemeProvider } from '../../theme/ThemeContext';
import { authApi } from '../../core/api/auth';
import {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  SETTINGS_SECTION_TITLES,
  SettingsScreen,
} from '../SettingsScreen';

jest.mock('../../core/api/auth', () => ({
  authApi: { me: jest.fn().mockRejectedValue(new Error('no session')), deleteAccount: jest.fn() },
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const mockDeleteAccount = authApi.deleteAccount as jest.Mock;

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
  mockDeleteAccount.mockReset().mockResolvedValue(undefined);
});

describe('SettingsScreen sections', () => {
  it('does not offer a Data section for the Clear All Data control that deleted nothing', () => {
    expect(SETTINGS_SECTION_TITLES).not.toContain('Data');
  });

  it('does not offer a Notifications section for the switch that persisted nothing and had no web counterpart', () => {
    expect(SETTINGS_SECTION_TITLES).not.toContain('Notifications');
  });

  it("offers exactly the sections that are real, working settings, in the web's order", () => {
    expect(SETTINGS_SECTION_TITLES).toEqual(['Account', 'Units', 'Appearance', 'Delete account']);
  });

  // App Store Guideline 5.1.1(v): an app that supports account creation must offer account
  // deletion within the app. SignupScreen creates accounts, so the trigger is met, and the
  // only delete route before this landed was admin-only.
  it('offers account deletion, which Guideline 5.1.1(v) requires of an app that creates accounts', () => {
    expect(SETTINGS_SECTION_TITLES).toContain('Delete account');
  });

  it('puts the irreversible control last, not between two preference pickers', () => {
    expect(SETTINGS_SECTION_TITLES[SETTINGS_SECTION_TITLES.length - 1]).toBe('Delete account');
  });
});

/**
 * The screen reads server state now, so it needs a `QueryClientProvider` the way it has one in
 * `App.tsx`. It gained that dependency when the unit choice started being reported to the
 * profile — the device's `AppSettings.units` is still what the UI renders, but the server
 * needs a copy so the weight-units migration can find which accounts entered pounds.
 *
 * A client per render, with retries off: a shared one would carry a cached profile between
 * cases, and a retrying one would hold the test open on the failed fetch this stack has no
 * server for.
 */
function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ThemeProvider>
          <AuthProvider>
            <SettingsScreen />
          </AuthProvider>
        </ThemeProvider>
      </SettingsProvider>
    </QueryClientProvider>
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

describe('Delete account section', () => {
  /**
   * Opens the confirmation dialog and returns the rendered screen. The three labels are
   * deliberately distinct strings ("Delete account" section, "Delete my account" trigger,
   * "Delete permanently" confirm) so neither this helper nor a reader has to disambiguate
   * by position.
   */
  async function openDialog() {
    const r = await renderScreen();
    // `find`, not `get`: ThemeProvider renders nothing until the fonts resolve.
    fireEvent.press(await r.findByText('Delete my account'));
    return r;
  }

  it('does not delete on the first tap — the dialog has to be confirmed', async () => {
    await openDialog();

    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('warns that the action is irreversible', async () => {
    const r = await openDialog();

    await r.findByText(/cannot be undone/i);
  });

  // A tap-through confirmation is the right weight for deleting one workout. It is not the
  // right weight for deleting the account, and Apple's reviewer taps everything.
  it('keeps the confirm button inert until the phrase is typed', async () => {
    const r = await openDialog();

    fireEvent.press(await r.findByText('Delete permanently'));

    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('calls the delete endpoint once the phrase is typed', async () => {
    const r = await openDialog();

    fireEvent.changeText(
      await r.findByLabelText(`Type ${DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm`),
      DELETE_ACCOUNT_CONFIRMATION_PHRASE,
    );
    fireEvent.press(await r.findByText('Delete permanently'));

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));
  });

  // A near-miss must not be treated as close enough.
  it('ignores a phrase that is not the exact word', async () => {
    const r = await openDialog();

    fireEvent.changeText(
      await r.findByLabelText(`Type ${DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm`),
      'delet',
    );
    fireEvent.press(await r.findByText('Delete permanently'));

    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });
});
