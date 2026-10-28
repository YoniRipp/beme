import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Units } from '@trackvibe/shared/settings';
import { SETTINGS_STORAGE_KEY, SettingsProvider } from '../../../context/SettingsContext';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { profileApi, type ApiProfile } from '../../../core/api/health';
import { SetupWizardScreen } from '../SetupWizardScreen';

/**
 * The five-step first run, mirroring `frontend/src/components/onboarding/SetupWizard.tsx`:
 * Welcome, Basic Info, Body Stats, Activity, Complete — same order, same fields, same skip
 * affordance on the first step only.
 *
 * The point of matching it exactly is that one row backs both clients: a user who set up on
 * the phone and a user who set up in the browser have to end with the same `user_profiles`
 * row, or the AI prompt builders read a different profile depending on where the account
 * was created.
 */

jest.mock('../../../core/api/health', () => ({
  profileApi: { get: jest.fn(), upsert: jest.fn() },
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const mockGet = profileApi.get as jest.Mock;
const mockUpsert = profileApi.upsert as jest.Mock;

/** What `GET /api/profile` returns for an account with no row (`controllers/profile.ts:13`). */
const NO_ROW: ApiProfile = {
  setupCompleted: false,
  waterGoalGlasses: 8,
  cycleTrackingEnabled: false,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  mockGet.mockReset().mockResolvedValue(NO_ROW);
  mockUpsert.mockReset().mockImplementation((body) =>
    Promise.resolve({ ...NO_ROW, id: 'profile-1', ...body })
  );
});

const clients: QueryClient[] = [];

afterEach(() => {
  cleanup();
  clients.forEach((client) => {
    client.unmount();
    client.clear();
  });
  clients.length = 0;
});

async function renderWizard(units: Units = 'metric') {
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ units }));
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(queryClient);
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ThemeProvider>
          <SetupWizardScreen />
        </ThemeProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

/** Press Next `count` times, re-querying each step because the button moves with the step. */
async function next(r: Awaited<ReturnType<typeof renderWizard>>, count = 1) {
  for (let i = 0; i < count; i += 1) {
    fireEvent.press(await r.findByText('Next'));
  }
}

describe('SetupWizardScreen steps', () => {
  it('opens on the welcome step', async () => {
    const r = await renderWizard();

    await r.findByText('Welcome to TrackVibe');
    await r.findByText('1 of 5');
  });

  it("walks the web's five steps in the web's order", async () => {
    const r = await renderWizard();

    await r.findByText('Welcome to TrackVibe');
    await next(r);
    await r.findByText('Basic Info');
    await next(r);
    await r.findByText('Body Stats');
    await next(r);
    await r.findByText('Activity Level');
    await next(r);
    await r.findByText('All Set!');
    await r.findByText('5 of 5');
  });

  it('goes back to the step before', async () => {
    const r = await renderWizard();

    await next(r, 2);
    await r.findByText('Body Stats');
    fireEvent.press(await r.findByText('Back'));

    await r.findByText('Basic Info');
  });

  /**
   * Skip is offered once, on the first step, and Back takes its place afterwards — the web's
   * navigation row (`SetupWizard.tsx:274-286`). Two ways out of the same corner would make
   * the counter meaningless.
   */
  it('offers Skip only on the first step, and Back only after it', async () => {
    const r = await renderWizard();

    await r.findByText('Skip');
    expect(r.queryByText('Back')).toBeNull();

    await next(r);

    await r.findByText('Back');
    expect(r.queryByText('Skip')).toBeNull();
  });
});

describe('SetupWizardScreen skip', () => {
  /**
   * `SetupWizard.handleSkip:38-45` writes this and nothing else. Skipping must be
   * distinguishable from never having started: a row carrying only `setup_completed = true`
   * is the record that this user was asked and declined, and it is what stops the wizard
   * reappearing here and on the web.
   */
  it('completes the setup without inventing a single value the user did not give', async () => {
    const r = await renderWizard();

    fireEvent.press(await r.findByText('Skip'));

    await waitFor(() => expect(mockUpsert).toHaveBeenCalledTimes(1));
    expect(mockUpsert).toHaveBeenCalledWith({ setupCompleted: true });
  });
});

describe('SetupWizardScreen finish', () => {
  it('writes what the user entered, and marks the setup done', async () => {
    const r = await renderWizard();

    await next(r);
    fireEvent.press(await r.findByText('Male'));
    await next(r);
    fireEvent.changeText(await r.findByLabelText('Height (cm)'), '180');
    fireEvent.changeText(await r.findByLabelText('Current weight (kg)'), '80');
    fireEvent.changeText(await r.findByLabelText('Target weight (kg)'), '75');
    await next(r);
    fireEvent.press(await r.findByText('Moderately Active'));
    await next(r);
    fireEvent.press(await r.findByText('Get Started'));

    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        sex: 'male',
        heightCm: 180,
        currentWeight: 80,
        targetWeight: 75,
        activityLevel: 'moderate',
        setupCompleted: true,
      })
    );
  });

  /**
   * The partial-write rule. `backend/src/models/profile.ts:77-95` omits absent fields from
   * the INSERT so the column DEFAULT applies; an empty string or a zero would bypass that
   * and 23502 on what is, by definition here, a brand-new user's first write.
   */
  it('omits every field the user walked past rather than sending blanks', async () => {
    const r = await renderWizard();

    await next(r, 4);
    fireEvent.press(await r.findByText('Get Started'));

    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    const body = mockUpsert.mock.calls[0][0];
    expect(body.setupCompleted).toBe(true);
    expect(body.sex).toBeUndefined();
    expect(body.heightCm).toBeUndefined();
    expect(body.currentWeight).toBeUndefined();
    expect(body.activityLevel).toBeUndefined();
  });

  it('stores a weight typed in pounds as the kilograms the column holds', async () => {
    const r = await renderWizard('imperial');

    await next(r, 2);
    fireEvent.changeText(await r.findByLabelText('Current weight (lbs)'), '154.3');
    await next(r, 2);
    fireEvent.press(await r.findByText('Get Started'));

    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    expect(mockUpsert.mock.calls[0][0]).toMatchObject({ currentWeight: 70 });
  });
});

describe('SetupWizardScreen cycle tracking', () => {
  /**
   * The web shows this block on the Activity step only for `sex === 'female'`
   * (`SetupWizard.tsx:216`). It matters more here than it reads: this is the only place a
   * phone-only user could ever have turned cycle tracking on before the Settings section
   * existed, because the web's own switch is behind the same condition.
   */
  it('offers the cycle toggle once the user has said female', async () => {
    const r = await renderWizard();

    await next(r);
    fireEvent.press(await r.findByText('Female'));
    await next(r, 2);

    await r.findByLabelText('Enable cycle tracking');
  });

  it('does not offer it otherwise', async () => {
    const r = await renderWizard();

    await next(r);
    fireEvent.press(await r.findByText('Male'));
    await next(r, 2);

    await r.findByText('Activity Level');
    expect(r.queryByLabelText('Enable cycle tracking')).toBeNull();
  });

  it('writes the cycle pair when the user turns it on', async () => {
    const r = await renderWizard();

    await next(r);
    fireEvent.press(await r.findByText('Female'));
    await next(r, 2);
    fireEvent(await r.findByLabelText('Enable cycle tracking'), 'valueChange', true);
    await next(r);
    fireEvent.press(await r.findByText('Get Started'));

    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    expect(mockUpsert.mock.calls[0][0]).toMatchObject({
      cycleTrackingEnabled: true,
      averageCycleLength: 28,
    });
  });
});

describe('SetupWizardScreen BMI', () => {
  it('shows the BMI derived from what was entered', async () => {
    const r = await renderWizard();

    await next(r, 2);
    fireEvent.changeText(await r.findByLabelText('Height (cm)'), '170');
    fireEvent.changeText(await r.findByLabelText('Current weight (kg)'), '70');

    await r.findByText('24.2');
  });

  it('shows nothing where a BMI would go until both numbers are there', async () => {
    const r = await renderWizard();

    await next(r, 2);
    fireEvent.changeText(await r.findByLabelText('Height (cm)'), '170');

    await r.findByText('Body Stats');
    expect(r.queryByText('Your BMI')).toBeNull();
  });
});
