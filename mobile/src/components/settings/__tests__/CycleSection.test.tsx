import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsProvider } from '../../../context/SettingsContext';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { profileApi, type ApiProfile } from '../../../core/api/health';
import { CycleSection } from '../CycleSection';

/**
 * The cycle-tracking switch, mirroring `frontend/src/components/settings/CycleSection.tsx`.
 *
 * This is the control that makes `CycleCard` reachable at all. `HomeScreen:388` renders it
 * only when `profile.cycleTrackingEnabled`, and before this landed nothing on Expo could
 * set that flag — nor `sex`, which is what the web gates its own copy of this section on
 * (`frontend/src/pages/Settings.tsx:64`), so a phone-only user could not reach the switch
 * from either client.
 */

jest.mock('../../../core/api/health', () => ({
  profileApi: { get: jest.fn(), upsert: jest.fn() },
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const mockGet = profileApi.get as jest.Mock;
const mockUpsert = profileApi.upsert as jest.Mock;

const serverProfile = (over: Partial<ApiProfile> = {}): ApiProfile => ({
  id: 'profile-1',
  sex: 'female',
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

/**
 * Every client this file has made, torn down after each case.
 *
 * Hygiene rather than a fix for anything observed here: `useExercises.test.ts` records that
 * a React Query client left alive in a test keeps a `notifyManager` batch timer, and
 * `cleanup` unmounts the tree without knowing anything about the client behind it.
 *
 * (The four later cases in this file that once timed out at exactly the 1000 ms `findBy*`
 * ceiling were NOT this. They were an explicit `await act(...)` in the two cases above
 * nesting inside the act RNTL already wraps `render` and `fireEvent` in — overlapping act
 * scopes leave React unable to schedule, so every subsequent case rendered an empty tree.
 * Both were rewritten to drive the deferred promises with `waitFor` instead.)
 */
const clients: QueryClient[] = [];

afterEach(() => {
  cleanup();
  clients.forEach((client) => {
    client.unmount();
    client.clear();
  });
  clients.length = 0;
});

async function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(queryClient);
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ThemeProvider>
          <CycleSection />
        </ThemeProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

describe('CycleSection toggle', () => {
  it('turns tracking on, which is what makes the Home cycle card render at all', async () => {
    const r = await renderSection();

    fireEvent(await r.findByLabelText('Enable cycle tracking'), 'valueChange', true);

    await waitFor(() =>
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ cycleTrackingEnabled: true })
      )
    );
  });

  it('sends the cycle length alongside, so enabling does not leave it unset', async () => {
    const r = await renderSection();

    fireEvent(await r.findByLabelText('Enable cycle tracking'), 'valueChange', true);

    await waitFor(() =>
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ averageCycleLength: 28 })
      )
    );
  });

  // Matches `CycleSection.tsx:28` — a length is meaningless with tracking off.
  it('omits the cycle length when switching tracking off', async () => {
    mockGet.mockResolvedValue(serverProfile({ cycleTrackingEnabled: true }));
    const r = await renderSection();

    await waitFor(async () =>
      expect((await r.findByLabelText('Enable cycle tracking')).props.value).toBe(true)
    );
    fireEvent(await r.findByLabelText('Enable cycle tracking'), 'valueChange', false);

    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    expect(mockUpsert.mock.calls[0][0].averageCycleLength).toBeUndefined();
  });

  it('moves the switch immediately rather than waiting for the round trip', async () => {
    let release: (value: ApiProfile) => void = () => {};
    mockUpsert.mockReturnValue(new Promise<ApiProfile>((resolve) => { release = resolve; }));
    const r = await renderSection();
    const toggle = await r.findByLabelText('Enable cycle tracking');

    fireEvent(toggle, 'valueChange', true);

    /**
     * Asserted while the write is still deferred, which is what makes it about optimism:
     * the server has not answered and cannot answer until `release` below, so a switch that
     * waited for the round trip would still be off here and this would time out.
     */
    await waitFor(() =>
      expect(r.getByLabelText('Enable cycle tracking').props.value).toBe(true)
    );

    // Let the deferred write settle before the case ends — a promise still in flight at the
    // end of one leaves work queued for the next.
    release(serverProfile({ cycleTrackingEnabled: true }));
    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
  });

  /**
   * A profile landing mid-toggle must not undo the toggle.
   *
   * Mirroring `profile.cycleTrackingEnabled` into local state with an effect makes every
   * arrival of the profile a write to the switch — so a read that resolves while the write
   * is still in flight (a first load the user got ahead of, or any background refetch)
   * flips the switch back to the value the server has not been told about yet. The user
   * sees their toggle undo itself, then redo itself when the PUT lands.
   *
   * Written deterministically on purpose: this first showed up as `-w 2` failing where a
   * single-file run passed, which is the same defect wearing a flake's clothes.
   */
  it('keeps the toggle when the profile read resolves while the write is still in flight', async () => {
    let releaseProfile: (value: ApiProfile) => void = () => {};
    let releaseWrite: (value: ApiProfile) => void = () => {};
    mockGet.mockReturnValue(new Promise<ApiProfile>((resolve) => { releaseProfile = resolve; }));
    // Deferred rather than never-resolving: a promise still pending when the case ends
    // leaves work queued for the next one.
    mockUpsert.mockReturnValue(new Promise<ApiProfile>((resolve) => { releaseWrite = resolve; }));
    const r = await renderSection();

    fireEvent(await r.findByLabelText('Enable cycle tracking'), 'valueChange', true);

    // The in-flight read finally answers — with the pre-toggle value, because the write has
    // not reached the server yet.
    releaseProfile(serverProfile({ cycleTrackingEnabled: false, averageCycleLength: 31 }));

    /**
     * Waiting on the cycle length, not on the switch, and that is the whole trick. A
     * `waitFor` on the switch would pass on its first poll — before the profile has been
     * applied — and so would report success on exactly the bug this exists to catch. The
     * length field is the witness that the profile really did land; only then is the
     * switch's value worth asserting.
     */
    await waitFor(() =>
      expect(r.getByLabelText('Average cycle length (days)').props.value).toBe('31')
    );
    expect(r.getByLabelText('Enable cycle tracking').props.value).toBe(true);

    releaseWrite(serverProfile({ cycleTrackingEnabled: true, averageCycleLength: 31 }));
    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
  });

  /**
   * The other half of an optimistic toggle, and the half that is usually missed: a switch
   * left showing "on" after the write failed tells the user cycle tracking is enabled when
   * the server says it is not (`CycleSection.tsx:31-34`).
   */
  it('puts the switch back when the write fails', async () => {
    mockUpsert.mockRejectedValue(new Error('offline'));
    const r = await renderSection();

    fireEvent(await r.findByLabelText('Enable cycle tracking'), 'valueChange', true);

    await waitFor(async () =>
      expect((await r.findByLabelText('Enable cycle tracking')).props.value).toBe(false)
    );
  });
});

describe('CycleSection cycle length', () => {
  it('stays out of the way until tracking is on', async () => {
    const r = await renderSection();

    await r.findByLabelText('Enable cycle tracking');
    expect(r.queryByLabelText('Average cycle length (days)')).toBeNull();
  });

  it('offers the length once tracking is on, seeded from the profile', async () => {
    mockGet.mockResolvedValue(
      serverProfile({ cycleTrackingEnabled: true, averageCycleLength: 31 })
    );
    const r = await renderSection();

    await waitFor(async () =>
      expect((await r.findByLabelText('Average cycle length (days)')).props.value).toBe('31')
    );
  });

  it('saves an edited length on its own button', async () => {
    mockGet.mockResolvedValue(serverProfile({ cycleTrackingEnabled: true }));
    const r = await renderSection();

    fireEvent.changeText(await r.findByLabelText('Average cycle length (days)'), '30');
    fireEvent.press(await r.findByText('Save'));

    await waitFor(() =>
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ averageCycleLength: 30 })
      )
    );
  });

  /**
   * 15-60 is the web's range (`CycleSection.tsx:69-77`), where it is spent on `<input min/max>`
   * — advisory in a browser, and absent entirely on a React Native TextInput. A cycle length
   * of 0 would divide `CycleCard`'s day-of-cycle arithmetic.
   */
  it('refuses a length outside the range rather than writing it', async () => {
    mockGet.mockResolvedValue(serverProfile({ cycleTrackingEnabled: true }));
    const r = await renderSection();

    fireEvent.changeText(await r.findByLabelText('Average cycle length (days)'), '0');
    fireEvent.press(await r.findByText('Save'));

    await waitFor(() => expect(r.queryByText(/between 15 and 60/i)).not.toBeNull());
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
