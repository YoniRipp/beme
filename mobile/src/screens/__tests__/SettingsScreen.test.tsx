import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../context/AuthContext';
import { loadStoredSettings, SettingsProvider } from '../../context/SettingsContext';
import { ThemeProvider } from '../../theme/ThemeContext';
import { authApi } from '../../core/api/auth';
import { profileApi, type ApiProfile } from '../../core/api/health';
import {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  SETTINGS_SECTION_TITLES,
  SettingsScreen,
} from '../SettingsScreen';

jest.mock('../../core/api/auth', () => ({
  authApi: { me: jest.fn().mockRejectedValue(new Error('no session')), deleteAccount: jest.fn() },
}));

// The screen reads the profile now — the Profile section edits it, and the Cycle section is
// gated on its `sex`. Mocked so each case can state the profile it is about.
jest.mock('../../core/api/health', () => ({
  profileApi: { get: jest.fn(), upsert: jest.fn() },
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const mockDeleteAccount = authApi.deleteAccount as jest.Mock;
const mockProfileGet = profileApi.get as jest.Mock;
const mockProfileUpsert = profileApi.upsert as jest.Mock;

const serverProfile = (over: Partial<ApiProfile> = {}): ApiProfile => ({
  id: 'profile-1',
  setupCompleted: true,
  waterGoalGlasses: 8,
  cycleTrackingEnabled: false,
  ...over,
});

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
  mockProfileGet.mockReset().mockResolvedValue(serverProfile());
  mockProfileUpsert.mockReset().mockImplementation((body) =>
    Promise.resolve(serverProfile(body))
  );
});

describe('SettingsScreen sections', () => {
  it('does not offer a Data section for the Clear All Data control that deleted nothing', () => {
    expect(SETTINGS_SECTION_TITLES).not.toContain('Data');
  });

  it('does not offer a Notifications section for the switch that persisted nothing and had no web counterpart', () => {
    expect(SETTINGS_SECTION_TITLES).not.toContain('Notifications');
  });

  it("offers exactly the sections that are real, working settings, in the web's order", () => {
    expect(SETTINGS_SECTION_TITLES).toEqual([
      'Account',
      'Profile',
      'Cycle Tracking',
      'Units',
      'Appearance',
      'Legal',
      'Delete account',
    ]);
  });

  /**
   * Profile and Cycle sit between Account and Units on the web
   * (`frontend/src/pages/Settings.tsx:62-67`), and this client had neither — which left
   * `waterGoalGlasses`, `averageCycleLength` and `cycleTrackingEnabled` unwritable from the
   * phone, so the Home water card counted to a permanent 8 and the cycle card could never
   * appear at all.
   */
  it('puts the fitness profile where the web puts it, between Account and Units', () => {
    const order = SETTINGS_SECTION_TITLES;
    expect(order.indexOf('Profile')).toBeGreaterThan(order.indexOf('Account'));
    expect(order.indexOf('Profile')).toBeLessThan(order.indexOf('Units'));
    expect(order.indexOf('Cycle Tracking')).toBe(order.indexOf('Profile') + 1);
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

  /**
   * Guideline 5.1.1(i) requires the privacy policy to be reachable "within the app in an
   * easily accessible manner", and this client linked to neither a policy nor terms from
   * anywhere. Asserted on the exported title list rather than by rendering, because what the
   * guideline is about is the section existing at all — `LegalLinks` owns what is inside it.
   */
  it('offers a Legal section, which App Store review requires and this client had none of', () => {
    expect(SETTINGS_SECTION_TITLES).toContain('Legal');
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

describe('Profile section', () => {
  it('offers the fitness profile this client could not edit at all', async () => {
    const r = await renderScreen();

    await r.findByText('Profile');
    await r.findByLabelText('Height (cm)');
    await r.findByText('Save Profile');
  });

  /**
   * The water card's denominator. `WaterCard.tsx:29` divides by `profile.waterGoalGlasses`,
   * and with nothing on Expo able to write it the goal was a permanent 8 for every
   * phone-only user.
   */
  it('offers the water goal the Home water card counts against', async () => {
    const r = await renderScreen();

    await r.findByLabelText('Water goal (glasses)');
  });
});

describe('Cycle section', () => {
  /**
   * The web renders its copy only for `profile.sex === 'female'`
   * (`frontend/src/pages/Settings.tsx:64`), and this client matches rather than inventing a
   * different condition — the two clients read and write one row.
   */
  it('offers cycle tracking to a user whose profile says female', async () => {
    mockProfileGet.mockResolvedValue(serverProfile({ sex: 'female' }));
    const r = await renderScreen();

    await r.findByText('Cycle Tracking');
    await r.findByLabelText('Enable cycle tracking');
  });

  it('does not offer it to a user whose profile says otherwise', async () => {
    mockProfileGet.mockResolvedValue(serverProfile({ sex: 'male' }));
    const r = await renderScreen();

    await r.findByText('Profile');
    expect(r.queryByText('Cycle Tracking')).toBeNull();
  });

  it('does not offer it before the user has said, which is the state every new account is in', async () => {
    const r = await renderScreen();

    await r.findByText('Profile');
    expect(r.queryByText('Cycle Tracking')).toBeNull();
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
