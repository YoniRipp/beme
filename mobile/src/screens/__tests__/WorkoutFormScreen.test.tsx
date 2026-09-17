import { mergeExerciseEdits } from '../WorkoutFormScreen';
import type { Exercise } from '../../types/workout';

const loaded: Exercise = {
  name: ' Bench press ',
  sets: 3,
  reps: 8,
  repsPerSet: [8, 8, 6],
  weightPerSet: [60, 60, 65],
  completedPerSet: [true, true, false],
  weight: 60,
  notes: 'paused',
};

describe('WorkoutFormScreen save payload', () => {
  it('keeps the per-set data the form does not edit', () => {
    const out = mergeExerciseEdits(loaded);
    expect(out.repsPerSet).toEqual([8, 8, 6]);
    expect(out.weightPerSet).toEqual([60, 60, 65]);
    expect(out.completedPerSet).toEqual([true, true, false]);
  });

  it('still applies the fields the form does edit', () => {
    const out = mergeExerciseEdits({ ...loaded, reps: 10, weight: 65 });
    expect(out.name).toBe('Bench press');
    expect(out.reps).toBe(10);
    expect(out.weight).toBe(65);
    expect(out.notes).toBe('paused');
  });

  it('keeps the blank-field fallbacks the form already had', () => {
    const out = mergeExerciseEdits({ name: 'Squat', sets: 0, reps: 0, weight: 0, notes: '' });
    expect(out).toEqual({ name: 'Squat', sets: 3, reps: 10, weight: undefined, notes: undefined });
  });

  it('adds nothing to a freshly added exercise', () => {
    const out = mergeExerciseEdits({ name: 'Row', sets: 3, reps: 10 });
    expect(out.repsPerSet).toBeUndefined();
    expect(out.weightPerSet).toBeUndefined();
    expect(out.completedPerSet).toBeUndefined();
  });
});

/**
 * The form could not save a workout, and did not say why.
 *
 * `durationMinutes` was `parseInt(duration) || 0` and the field starts empty, while the backend
 * requires `min(1)` (`backend/src/schemas/routeSchemas.ts`). So leaving duration blank — the
 * default state of a new workout — produced a 400 that surfaced as "Failed to save workout".
 *
 * `workoutFormSchema` has said "Duration is required" in `packages/shared` the whole time, and
 * nothing on this client had ever imported it.
 *
 * These render the screen rather than testing the schema, because the schema was never the
 * broken part: the bug was that nobody asked it.
 */
import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { SettingsProvider } from '../../context/SettingsContext';
import { ThemeProvider } from '../../theme/ThemeContext';
import { WorkoutFormScreen } from '../WorkoutFormScreen';

const mockAddWorkout = jest.fn();
const mockUpdateWorkout = jest.fn();
const mockGoBack = jest.fn();

/** Set per case, before render, so one set of module mocks can serve both. */
let mockRouteParams: { workoutId?: string } | undefined;
let mockStoredWorkout: Record<string, unknown> | undefined;

jest.mock('@react-navigation/native', () => ({
  // `setOptions` is called from an effect on mount; without it the screen throws before render.
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn(), setOptions: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));
jest.mock('../../hooks/useWorkouts', () => ({
  useWorkouts: () => ({
    getWorkoutById: () => mockStoredWorkout,
    addWorkout: (...args: unknown[]) => mockAddWorkout(...args),
    updateWorkout: (...args: unknown[]) => mockUpdateWorkout(...args),
  }),
}));
jest.mock('react-native-toast-message', () => ({ __esModule: true, default: { show: jest.fn() } }));

// `ThemeProvider` resolves `PaperProvider` internally and needs `useSettings()` above it — the
// same stack `App.tsx` mounts, and the same one `SettingsScreen.test.tsx` builds.
const renderForm = () =>
  render(
    <SettingsProvider>
      <ThemeProvider>
        <WorkoutFormScreen />
      </ThemeProvider>
    </SettingsProvider>,
  );

describe('WorkoutFormScreen validation', () => {
  beforeEach(async () => {
    // `SettingsProvider` reads AsyncStorage on mount and renders nothing until it resolves, so
    // clear it between cases — same reason `SettingsScreen.test.tsx` does.
    await AsyncStorage.clear();
    mockRouteParams = undefined;
    mockStoredWorkout = undefined;
    mockAddWorkout.mockReset().mockResolvedValue(undefined);
    mockUpdateWorkout.mockReset().mockResolvedValue(undefined);
    (Toast.show as jest.Mock).mockReset();
  });

  // Explicit, because each case mounts its own `SettingsProvider`, whose AsyncStorage read is
  // in flight when the previous case ends. Without unmounting first, the second render's
  // provider never settles and the tree stays empty.
  afterEach(cleanup);

  /**
   * The bug. A new workout starts with an empty duration field, and the backend requires
   * `min(1)` — so the most ordinary thing a user can do produced a 400 that arrived as
   * "Failed to save workout".
   *
   * `findBy*` for the first query: `SettingsProvider` resolves stored settings asynchronously
   * and renders nothing until it has, so a synchronous query can run against an empty tree.
   */
  it('refuses to save a blank duration, and names the field', async () => {
    const { getByText, findByLabelText } = await renderForm();

    fireEvent.changeText(await findByLabelText('Exercise name'), 'Bench press');
    fireEvent.press(getByText('Log Workout'));

    await waitFor(() => expect(Toast.show).toHaveBeenCalled());
    expect(mockAddWorkout).not.toHaveBeenCalled();
    expect((Toast.show as jest.Mock).mock.calls[0][0].text1).toBe('Duration is required');
  });

  /**
   * The other half: validation must not block a form that is actually complete. Editing an
   * existing workout is the path that arrives with a duration already in the field, which is why
   * this case opens one rather than typing into it.
   */
  it('saves a workout that has a duration', async () => {
    mockRouteParams = { workoutId: 'w-1' };
    mockStoredWorkout = {
      id: 'w-1',
      title: 'Push day',
      type: 'strength',
      date: new Date(2026, 8, 17),
      durationMinutes: 45,
      exercises: [{ name: 'Bench press', sets: 3, reps: 10 }],
      notes: '',
      completed: false,
    };

    const { findByText } = await renderForm();

    fireEvent.press(await findByText('Update Workout'));

    await waitFor(() => expect(mockUpdateWorkout).toHaveBeenCalled());
    expect(mockUpdateWorkout.mock.calls[0][1].durationMinutes).toBe(45);
  });
});
