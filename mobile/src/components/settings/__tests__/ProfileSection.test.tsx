import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Units } from '@trackvibe/shared/settings';
import { SETTINGS_STORAGE_KEY, SettingsProvider } from '../../../context/SettingsContext';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { profileApi, type ApiProfile } from '../../../core/api/health';
import { ProfileSection } from '../ProfileSection';

/**
 * The editable fitness profile, mirroring `frontend/src/components/settings/
 * ProfileSection.tsx`.
 *
 * What makes this worth a rendered test rather than only the pure `profileForm` one: the
 * three things that can only go wrong in the wiring — that Save actually sends the built
 * payload, that the form is seeded from the server rather than left blank, and that the
 * weight field is captioned in the unit it is actually collecting.
 *
 * `await render(...)` and `findBy*` only: RNTL 14 made render async, and `ThemeProvider`
 * renders nothing at all until the fonts resolve, so a `getBy*` here reads an empty tree.
 */

jest.mock('../../../core/api/health', () => ({
  profileApi: { get: jest.fn(), upsert: jest.fn() },
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const mockGet = profileApi.get as jest.Mock;
const mockUpsert = profileApi.upsert as jest.Mock;

const serverProfile = (over: Partial<ApiProfile> = {}): ApiProfile => ({
  id: 'profile-1',
  setupCompleted: true,
  waterGoalGlasses: 8,
  cycleTrackingEnabled: false,
  ...over,
});

beforeEach(async () => {
  await AsyncStorage.clear();
  mockGet.mockReset().mockResolvedValue(serverProfile());
  mockUpsert.mockReset().mockImplementation((body) => Promise.resolve(serverProfile(body)));
});

afterEach(cleanup);

/**
 * A client per render, retries off: a shared one would carry a cached profile between cases,
 * and a retrying one would hold the test open on a rejection.
 */
async function renderSection(units: Units = 'metric') {
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ units }));
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ThemeProvider>
          <ProfileSection />
        </ThemeProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

describe('ProfileSection seeding', () => {
  /**
   * The form is seeded from the profile in an effect, so a form that renders BEFORE the
   * profile arrives gets overwritten the moment it does — silently wiping whatever the user
   * had already typed. `/api/profile` is one small request, but "small" is not "instant" on
   * a phone, and the first thing a user does on this screen is start filling it in.
   *
   * Found by this suite failing under `-w 2` while passing alone: the resolve landed after
   * the typing rather than before it. Timing that can invert under load is a bug, not a
   * flake.
   */
  it('does not offer the form until the profile it would overwrite has arrived', async () => {
    let release: (value: ApiProfile) => void = () => {};
    mockGet.mockReturnValue(new Promise<ApiProfile>((resolve) => { release = resolve; }));
    const r = await renderSection();

    expect(r.queryByLabelText('Height (cm)')).toBeNull();

    release(serverProfile({ heightCm: 170 }));
    await waitFor(async () =>
      expect((await r.findByLabelText('Height (cm)')).props.value).toBe('170')
    );
  });

  /**
   * PR #353 fixed "every mobile list screen rendered an empty state for a failed request"
   * across this client. A profile form is the same trap wearing a different hat: a blank
   * form after a failed load looks exactly like a profile the user has never filled in.
   */
  it('says so when the profile could not be loaded, rather than showing an empty form', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const r = await renderSection();

    await r.findByText(/could not load your profile/i);
    expect(r.queryByText('Save Profile')).toBeNull();
  });

  it('shows what the server already holds rather than an empty form', async () => {
    mockGet.mockResolvedValue(serverProfile({ heightCm: 170, currentWeight: 70 }));
    const r = await renderSection();

    await waitFor(async () =>
      expect((await r.findByLabelText('Height (cm)')).props.value).toBe('170')
    );
    expect((await r.findByLabelText('Current weight (kg)')).props.value).toBe('70');
  });

  it('offers the sexes the database accepts, not an invented set', async () => {
    const r = await renderSection();

    await r.findByText('Male');
    await r.findByText('Female');
    await r.findByText('Other');
    await r.findByText('Prefer not to say');
  });

  it('offers the five activity levels the database accepts', async () => {
    const r = await renderSection();

    await r.findByText('Sedentary');
    await r.findByText('Lightly Active');
    await r.findByText('Moderately Active');
    await r.findByText('Active');
    await r.findByText('Very Active');
  });
});

describe('ProfileSection saving', () => {
  it('writes the whole form on one explicit Save, not per field', async () => {
    const r = await renderSection();

    fireEvent.changeText(await r.findByLabelText('Height (cm)'), '180');
    expect(mockUpsert).not.toHaveBeenCalled();

    fireEvent.press(await r.findByText('Save Profile'));

    await waitFor(() => expect(mockUpsert).toHaveBeenCalledTimes(1));
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ heightCm: 180 }));
  });

  /**
   * The partial-write rule, end to end. `backend/src/models/profile.ts:77-95` omits absent
   * fields from the INSERT so the column DEFAULT applies; an empty string or a zero would
   * bypass that and 23502 on a brand-new user's first write.
   */
  it('omits a field the user never filled rather than sending an empty string', async () => {
    const r = await renderSection();

    fireEvent.press(await r.findByText('Save Profile'));

    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    const body = mockUpsert.mock.calls[0][0];
    expect(body.sex).toBeUndefined();
    expect(body.dateOfBirth).toBeUndefined();
    expect(body.heightCm).toBeUndefined();
  });

  /**
   * The Units radio owns `profile.units` (`SettingsScreen.reportUnits`). If a profile save
   * carried it too, the server copy would be rewritten by a screen the user did not use to
   * change it — and that field is the tag a future weight backfill depends on.
   */
  it('never reports a units preference the user did not change here', async () => {
    const r = await renderSection('imperial');

    fireEvent.press(await r.findByText('Save Profile'));

    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    expect(mockUpsert.mock.calls[0][0]).not.toHaveProperty('units');
  });
});

describe('ProfileSection weight units', () => {
  /**
   * `user_profiles.current_weight` is kilograms — both of its web writers hardcode "(kg)" —
   * so an imperial user's pounds are converted at this edge rather than stored raw. The
   * label and the number have to agree, which is the failure `packages/shared/src/domain/
   * units.ts` exists to have fixed for `weight_entries`.
   */
  it('captions the weight field in the unit the user actually types', async () => {
    const r = await renderSection('imperial');

    await r.findByLabelText('Current weight (lbs)');
    await r.findByLabelText('Target weight (lbs)');
  });

  it('shows a stored kilogram weight as pounds for an imperial user', async () => {
    mockGet.mockResolvedValue(serverProfile({ currentWeight: 70 }));
    const r = await renderSection('imperial');

    await waitFor(async () =>
      expect((await r.findByLabelText('Current weight (lbs)')).props.value).toBe('154.3')
    );
  });

  it('stores a weight typed in pounds as the kilograms the column holds', async () => {
    const r = await renderSection('imperial');

    fireEvent.changeText(await r.findByLabelText('Current weight (lbs)'), '154.3');
    fireEvent.press(await r.findByText('Save Profile'));

    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    expect(mockUpsert.mock.calls[0][0]).toMatchObject({ currentWeight: 70 });
  });
});

describe('ProfileSection BMI', () => {
  it('shows nothing until it has both a height and a weight', async () => {
    const r = await renderSection();

    await r.findByText('Save Profile');
    expect(r.queryByText('BMI')).toBeNull();
  });

  it('derives BMI from what is in the form, live', async () => {
    const r = await renderSection();

    fireEvent.changeText(await r.findByLabelText('Height (cm)'), '170');
    fireEvent.changeText(await r.findByLabelText('Current weight (kg)'), '70');

    await r.findByText('24.2');
  });

  // BMI is kg/m². Reading an imperial user's 154.3 as kilograms would report 53.4.
  it('derives the same BMI from the same body in pounds', async () => {
    const r = await renderSection('imperial');

    fireEvent.changeText(await r.findByLabelText('Height (cm)'), '170');
    fireEvent.changeText(await r.findByLabelText('Current weight (lbs)'), '154.3');

    await r.findByText('24.2');
  });
});
