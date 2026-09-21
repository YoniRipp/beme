import { applyPickedExercise, mergeExerciseEdits } from '../WorkoutFormScreen';
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
 * The same lesson as `mergeExerciseEdits`, one step earlier in the flow: a pick from the
 * exercise library carries a *name*, and nothing else about the row it lands on.
 *
 * Someone reaches for the library after they have already dialled in sets, reps and weight —
 * that is the case where typing the name by hand is most annoying and therefore where the
 * magnifier gets pressed. Rebuilding the exercise around the new name would trade the thing
 * they had done for the thing they hadn't, which is a worse deal than the typing.
 */
describe('applying a pick from the exercise library', () => {
  const twoRows: Exercise[] = [
    { name: 'Bench press', sets: 4, reps: 6, weight: 80, notes: 'belt' },
    { name: '', sets: 3, reps: 12, weight: 20, repsPerSet: [12, 12, 10], completedPerSet: [true, false, false] },
  ];

  it('renames the row it names and keeps everything else on it', () => {
    const out = applyPickedExercise(twoRows, 1, 'Cable Fly');

    expect(out[1]).toEqual({
      name: 'Cable Fly',
      sets: 3,
      reps: 12,
      weight: 20,
      repsPerSet: [12, 12, 10],
      completedPerSet: [true, false, false],
    });
  });

  it('leaves the rows that did not ask for a pick untouched', () => {
    const out = applyPickedExercise(twoRows, 1, 'Cable Fly');

    // Reference equality, not deep equality: an untouched row must not even be rebuilt, or
    // the `React.memo`'d rows above it re-render for nothing.
    expect(out[0]).toBe(twoRows[0]);
    expect(out).toHaveLength(2);
  });

  /**
   * "Add from library" passes an index past the end rather than first creating a blank row
   * for the user to fill, so an out-of-range index is the append path, not an error.
   */
  it('appends a row when the index is past the end', () => {
    const out = applyPickedExercise(twoRows, 2, 'Zercher Squat');

    expect(out).toHaveLength(3);
    expect(out[2]).toEqual({ name: 'Zercher Squat', sets: 3, reps: 10, weight: undefined, notes: undefined });
  });

  /** An empty form still has one blank row, so "append" has to work from a length of one. */
  it('appends from a single blank row without disturbing it', () => {
    const blank: Exercise[] = [{ name: '', sets: 3, reps: 10 }];

    const out = applyPickedExercise(blank, 1, 'Seated Cable Row');

    expect(out.map((e) => e.name)).toEqual(['', 'Seated Cable Row']);
  });

  /** A negative index can only be a bug upstream; appending loses nothing, indexing would throw. */
  it('appends rather than throwing on a negative index', () => {
    const out = applyPickedExercise(twoRows, -1, 'Cable Fly');

    expect(out).toHaveLength(3);
    expect(out[2].name).toBe('Cable Fly');
  });

  it('does not mutate the list it was given', () => {
    const before = JSON.parse(JSON.stringify(twoRows));

    applyPickedExercise(twoRows, 1, 'Cable Fly');
    applyPickedExercise(twoRows, 9, 'Zercher Squat');

    expect(twoRows).toEqual(before);
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
const mockNavigate = jest.fn();

/** Set per case, before render, so one set of module mocks can serve both. */
let mockRouteParams: { workoutId?: string; pickedExercise?: { index: number; name: string } } | undefined;
let mockStoredWorkout: Record<string, unknown> | undefined;

/**
 * Merges, the way React Navigation's own `setParams` does, instead of recording the call and
 * nothing else.
 *
 * The screen clears `pickedExercise` by setting it to `undefined` and relies on the next
 * render seeing that. A `jest.fn()` that only records would leave the param in place
 * forever, so the pick effect would re-apply on every subsequent render — appending a row
 * per keystroke — and the cases below would be testing a form the app never produces.
 */
const mockSetParams = jest.fn((next: Record<string, unknown>) => {
  mockRouteParams = { ...mockRouteParams, ...next };
});

/**
 * One object across renders, because the real `useNavigation` returns one.
 *
 * The pick effect has `navigation` in its dependency list. A fresh object per render would
 * re-fire it every render, which is exactly the bug the param-clearing exists to prevent —
 * the mock would hide it rather than catch it.
 */
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
  setParams: mockSetParams,
  // `setOptions` is called from an effect on mount; without it the screen throws before render.
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
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
//
// Built by a function rather than held as a constant so `rerender` can be handed an identical
// tree: same component types in the same positions, so React updates in place and the form
// keeps its state — which is the whole point of the cases that rerender.
const formTree = () => (
  <SettingsProvider>
    <ThemeProvider>
      <WorkoutFormScreen />
    </ThemeProvider>
  </SettingsProvider>
);

const renderForm = () => render(formTree());

const resetFormMocks = async () => {
  // `SettingsProvider` reads AsyncStorage on mount and renders nothing until it resolves, so
  // clear it between cases — same reason `SettingsScreen.test.tsx` does.
  await AsyncStorage.clear();
  mockRouteParams = undefined;
  mockStoredWorkout = undefined;
  mockAddWorkout.mockReset().mockResolvedValue(undefined);
  mockUpdateWorkout.mockReset().mockResolvedValue(undefined);
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  // `mockClear` rather than `mockReset` for this one: it carries the merging implementation
  // the screen depends on, and `mockReset` would throw the implementation away.
  mockSetParams.mockClear();
  (Toast.show as jest.Mock).mockReset();
};

describe('WorkoutFormScreen validation', () => {
  beforeEach(resetFormMocks);

  // Explicit, because each case mounts its own `SettingsProvider`, whose AsyncStorage read is
  // in flight when the previous case ends. Without unmounting first, the second render's
  // provider never settles and the tree stays empty.
  afterEach(cleanup);

  /**
   * The bug. A new workout starts with an empty duration field, and the backend requires
   * `min(1)` — so the most ordinary thing a user can do produced a 400 that arrived as
   * "Failed to save workout".
   *
   * `findBy*` for every query, never `getBy*`: `SettingsProvider` resolves stored settings
   * asynchronously and renders nothing until it has, so a synchronous query can run against
   * an empty tree. It is not only the first query that needs it — a `getBy*` mid-case leaves
   * React's async work half-flushed, and the later rendering cases in this file then mount
   * into nothing.
   */
  it('refuses to save a blank duration, and names the field', async () => {
    const { findByText, findByLabelText } = await renderForm();

    fireEvent.changeText(await findByLabelText('Exercise name'), 'Bench press');
    fireEvent.press(await findByText('Log Workout'));

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

/**
 * The wiring between this form and the exercise library, which is the part a unit test on
 * `applyPickedExercise` cannot reach.
 *
 * The library does not call back into the form. It navigates to it with a serializable
 * `pickedExercise` route param and `merge: true`, because a function in the navigation state
 * breaks state persistence and deep linking. That choice is what these cases are about: the
 * pick arrives as a *render*, not as a call, so everything interesting is in what survives
 * that render and in the param being cleared afterwards.
 *
 * `rerender` with an identical tree is how a param arriving after mount is simulated —
 * `useRoute` reads module state, so mutating it and re-rendering is exactly the sequence the
 * navigator produces, minus the navigator.
 */
describe('WorkoutFormScreen exercise picker', () => {
  beforeEach(resetFormMocks);
  afterEach(cleanup);

  const storedWorkout = (exercises: unknown[]) => ({
    id: 'w-1',
    title: 'Push day',
    type: 'strength',
    date: new Date(2026, 8, 17),
    durationMinutes: 45,
    exercises,
    notes: '',
    completed: false,
  });

  /**
   * The entry point on a row that already exists. The index has to be the row's own, or the
   * pick comes back and renames somebody else's exercise.
   */
  it('opens the library for the row whose magnifier was pressed', async () => {
    mockRouteParams = { workoutId: 'w-1' };
    mockStoredWorkout = storedWorkout([
      { name: 'Bench press', sets: 3, reps: 10 },
      { name: 'Cable fly', sets: 3, reps: 12 },
    ]);

    const r = await renderForm();

    fireEvent.press(await r.findByLabelText('Choose exercise 2 from the library'));

    expect(mockNavigate).toHaveBeenCalledWith('Exercises', { selectForIndex: 1, returnTo: 'WorkoutForm' });
  });

  /**
   * The other entry point. "Add from library" has no row yet, so it asks for an index one
   * past the end — the append signal `applyPickedExercise` reads — rather than creating a
   * blank row first and leaving one behind if the user backs out of the picker.
   */
  it('asks the library to append when entered from "Add from library"', async () => {
    mockRouteParams = { workoutId: 'w-1' };
    mockStoredWorkout = storedWorkout([
      { name: 'Bench press', sets: 3, reps: 10 },
      { name: 'Cable fly', sets: 3, reps: 12 },
    ]);

    const r = await renderForm();

    fireEvent.press(await r.findByText('Add from library'));

    expect(mockNavigate).toHaveBeenCalledWith('Exercises', { selectForIndex: 2, returnTo: 'WorkoutForm' });
  });

  it('puts a pick into the row it names', async () => {
    mockRouteParams = { workoutId: 'w-1' };
    mockStoredWorkout = storedWorkout([
      { name: 'Bench press', sets: 3, reps: 10 },
      { name: '', sets: 3, reps: 12 },
    ]);

    const r = await renderForm();
    mockRouteParams = { ...mockRouteParams, pickedExercise: { index: 1, name: 'Cable Fly' } };
    await r.rerender(formTree());

    const names = await r.findAllByLabelText('Exercise name');
    expect(names.map((n) => n.props.value)).toEqual(['Bench press', 'Cable Fly']);
  });

  it('appends a row for a pick made from "Add from library"', async () => {
    const r = await renderForm();
    mockRouteParams = { pickedExercise: { index: 1, name: 'Zercher Squat' } };
    await r.rerender(formTree());

    // No `waitFor` around this: `rerender` runs inside `act`, so the pick effect and the
    // state update it queues have both flushed by the time it resolves.
    const names = await r.findAllByLabelText('Exercise name');
    expect(names.map((n) => n.props.value)).toEqual(['', 'Zercher Squat']);
  });

  /**
   * The composition that actually reaches the API: a pick renames the row, and
   * `mergeExerciseEdits` then has to send that name on top of the per-set data the form
   * never displayed. Either half getting this wrong is silent — the save succeeds and the
   * set-by-set history is gone.
   */
  it('saves the picked name without dropping the per-set data underneath it', async () => {
    mockRouteParams = { workoutId: 'w-1' };
    mockStoredWorkout = storedWorkout([
      {
        name: 'Bench pres',
        sets: 3,
        reps: 8,
        weight: 60,
        repsPerSet: [8, 8, 6],
        weightPerSet: [60, 60, 65],
        completedPerSet: [true, true, false],
      },
    ]);

    const r = await renderForm();
    mockRouteParams = { ...mockRouteParams, pickedExercise: { index: 0, name: 'Bench Press' } };
    await r.rerender(formTree());

    expect((await r.findByLabelText('Exercise name')).props.value).toBe('Bench Press');
    fireEvent.press(await r.findByText('Update Workout'));

    await waitFor(() => expect(mockUpdateWorkout).toHaveBeenCalled());
    expect(mockUpdateWorkout.mock.calls[0][1].exercises[0]).toEqual({
      name: 'Bench Press',
      sets: 3,
      reps: 8,
      weight: 60,
      repsPerSet: [8, 8, 6],
      weightPerSet: [60, 60, 65],
      completedPerSet: [true, true, false],
      notes: undefined,
    });
  });

  /**
   * The reason the library navigates with `merge: true` and not a bare params object, and
   * the reason the effect clears the param once it has used it. Both halves are one
   * scenario, so they are one case.
   *
   * By the time someone reaches for the picker they have usually already typed a title and a
   * duration. A pick that replaced the route's params instead of merging into them would
   * come back to a form that had lost both. And because a param outlives the render that
   * delivered it, a pick that was not cleared would be re-applied by the *next* render for
   * any reason at all — one more row per keystroke in the title field.
   *
   * **This case must stay last in the file.** It is the only one that fires an event and
   * then re-renders, and that pairing leaves React 19's shared act queue in a state where
   * every subsequent `render` in the same file commits nothing: the tree comes back empty
   * and every query times out, which reads like a broken test and is not. Adding a case?
   * Put it above this one.
   */
  it('applies a pick without disturbing what the user had already typed', async () => {
    const r = await renderForm();

    fireEvent.changeText(await r.findByLabelText('Title'), 'Leg day');
    fireEvent.changeText(await r.findByLabelText('Duration (minutes)'), '52');
    fireEvent.changeText(await r.findByLabelText('Notes'), 'felt strong');

    // An appending pick rather than a renaming one, so that a pick applied twice would show
    // up as a third row. A rename applied twice is indistinguishable from a rename applied
    // once, and would let the clear stop working without anything failing.
    mockRouteParams = { pickedExercise: { index: 1, name: 'Zercher Squat' } };
    await r.rerender(formTree());

    expect((await r.findByLabelText('Title')).props.value).toBe('Leg day');
    expect((await r.findByLabelText('Duration (minutes)')).props.value).toBe('52');
    expect((await r.findByLabelText('Notes')).props.value).toBe('felt strong');
    expect((await r.findAllByLabelText('Exercise name')).map((n) => n.props.value)).toEqual([
      '',
      'Zercher Squat',
    ]);

    // Cleared, so the render the next keystroke causes cannot apply the same pick again.
    expect(mockSetParams).toHaveBeenCalledWith({ pickedExercise: undefined });
    fireEvent.changeText(await r.findByLabelText('Title'), 'Leg day 2');
    expect(await r.findAllByLabelText('Exercise name')).toHaveLength(2);
  });
});
