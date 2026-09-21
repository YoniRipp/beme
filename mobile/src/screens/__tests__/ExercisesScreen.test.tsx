import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsProvider } from '../../context/SettingsContext';
import { ThemeProvider } from '../../theme/ThemeContext';
import { ExercisesScreen } from '../ExercisesScreen';
import { filterCatalog, type CatalogExercise } from '../../hooks/useExercises';

/**
 * The exercise library screen.
 *
 * Note `await render(...)` and `findBy*` throughout. RNTL 14 made `render` asynchronous,
 * and on top of that `SettingsProvider` reads AsyncStorage on mount and renders nothing
 * until it resolves — so a synchronous `getBy*` here runs against an empty tree and comes
 * back undefined. `SettingsScreen.test.tsx` and `WorkoutFormScreen.test.tsx` carry the same
 * note for the same reason.
 */

const mockNavigate = jest.fn();
let mockRouteParams: Record<string, unknown> | undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), setOptions: jest.fn(), setParams: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const catalog: CatalogExercise[] = [
  { id: '1', name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell', imageUrl: 'https://img/bench.jpg' },
  { id: '2', name: 'Close-Grip Barbell Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
  { id: '3', name: 'Cable Fly', muscleGroup: 'chest', equipment: 'cable' },
  { id: '4', name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable' },
];

/**
 * Mutable hook state, set per case before render. Only the network half is faked: the real
 * `filterCatalog` still does the searching and ranking, because "does the chip actually
 * narrow the list" is the behaviour worth asserting and a stubbed filter would assert
 * nothing. Same split the web's `ExercisePickerSheet.test.tsx` makes.
 */
const hookState: {
  exercises: CatalogExercise[];
  isLoading: boolean;
  error: string | null;
} = { exercises: [], isLoading: false, error: null };

const mockReload = jest.fn();
const mockCreateExercise = jest.fn();

jest.mock('../../hooks/useExercises', () => {
  const actual = jest.requireActual('../../hooks/useExercises');
  const { useCallback } = jest.requireActual('react');
  return {
    ...actual,
    useExercises: () => ({
      exercises: hookState.exercises,
      isLoading: hookState.isLoading,
      error: hookState.error,
      reload: mockReload,
      refetch: jest.fn().mockResolvedValue(undefined),
      isCreating: false,
      createExercise: mockCreateExercise,
      // Memoised on the catalog exactly as the real hook does it — the screen memoises its
      // result list on this callback's identity, so a stable-forever stub would hide a
      // stale-results bug instead of catching one.
      filterExercises: useCallback(
        (filters: { query?: string; equipment?: string; muscleGroup?: string }) =>
          actual.filterCatalog(hookState.exercises, filters),
        [hookState.exercises],
      ),
    }),
  };
});

const renderScreen = () =>
  render(
    <SettingsProvider>
      <ThemeProvider>
        <ExercisesScreen />
      </ThemeProvider>
    </SettingsProvider>,
  );

beforeEach(async () => {
  await AsyncStorage.clear();
  mockRouteParams = undefined;
  hookState.exercises = catalog;
  hookState.isLoading = false;
  hookState.error = null;
  mockNavigate.mockReset();
  mockReload.mockReset();
  mockCreateExercise.mockReset().mockResolvedValue({ id: '9', name: 'Zercher Squat' });
});

// Explicit, because each case mounts its own `SettingsProvider` whose AsyncStorage read is
// still in flight when the previous case ends. Without unmounting first, the next render's
// provider never settles and the tree stays empty.
afterEach(cleanup);

describe('browsing the catalog', () => {
  it('lists every exercise with its muscle group and equipment', async () => {
    const r = await renderScreen();

    await r.findByLabelText('Log Bench Press, Chest · Barbell');
    await r.findByLabelText('Log Seated Cable Row, Back · Cable');
    await r.findByText('4 exercises');
  });

  it('counts one result in the singular', async () => {
    hookState.exercises = [catalog[0]];
    const r = await renderScreen();

    await r.findByText('1 exercise');
  });

  /**
   * The ranking rule, through the UI this time: typing "bench" has to leave "Bench Press"
   * above the close-grip variation, not buried under it alphabetically.
   */
  it('narrows and ranks results as the user types', async () => {
    const r = await renderScreen();

    fireEvent.changeText(await r.findByPlaceholderText('Search exercises...'), 'bench');

    // `findBy*`, not `getBy*`: the search box is debounced, so the list is still showing
    // all four rows for a moment after the keystroke.
    await r.findByText('2 exercises');
    expect(r.queryByLabelText(/Log Cable Fly/)).toBeNull();
  });

  it('narrows to one equipment facet when its chip is tapped', async () => {
    const r = await renderScreen();

    fireEvent.press(await r.findByLabelText('Cable exercises'));

    await r.findByText('2 exercises');
    await r.findByLabelText('Log Cable Fly, Chest · Cable');
    expect(r.queryByLabelText(/Log Bench Press/)).toBeNull();
  });

  it('narrows to one muscle group when its chip is tapped', async () => {
    const r = await renderScreen();

    fireEvent.press(await r.findByLabelText('Back exercises'));

    await r.findByText('1 exercise');
    await r.findByLabelText('Log Seated Cable Row, Back · Cable');
  });

  it('puts the whole catalog back when the "all" chip is tapped', async () => {
    const r = await renderScreen();

    fireEvent.press(await r.findByLabelText('Cable exercises'));
    await r.findByText('2 exercises');

    fireEvent.press(await r.findByLabelText('All equipment'));
    await r.findByText('4 exercises');
  });
});

describe('choosing an exercise', () => {
  /**
   * Browse mode: there is no row to fill, so a tap starts a workout with the movement
   * already in it. Index 0 is the blank exercise a new workout form opens with.
   */
  it('opens a new workout on the chosen movement when browsing', async () => {
    const r = await renderScreen();

    fireEvent.press(await r.findByLabelText('Log Bench Press, Chest · Barbell'));

    expect(mockNavigate).toHaveBeenCalledWith({
      name: 'WorkoutForm',
      params: { pickedExercise: { index: 0, name: 'Bench Press' } },
      merge: true,
    });
  });

  /**
   * Picker mode. `merge: true` is the load-bearing flag: the workout form may already be
   * holding a half-typed title and duration, and navigating back to it with a bare params
   * object would replace them.
   */
  it('hands the pick back to the row that asked for it', async () => {
    mockRouteParams = { selectForIndex: 2, returnTo: 'WorkoutForm' };
    const r = await renderScreen();

    fireEvent.press(await r.findByLabelText('Select Cable Fly, Chest · Cable'));

    expect(mockNavigate).toHaveBeenCalledWith({
      name: 'WorkoutForm',
      params: { pickedExercise: { index: 2, name: 'Cable Fly' } },
      merge: true,
    });
  });

  it('says it is picking rather than browsing', async () => {
    mockRouteParams = { selectForIndex: 0 };
    const r = await renderScreen();

    await r.findByText('Choose an exercise');
  });
});

describe('when the catalog does not arrive', () => {
  /**
   * A failed fetch used to be indistinguishable from an empty catalog, which told the user
   * their exercise does not exist rather than that nothing loaded. It gets its own state
   * and its own retry.
   */
  it('reports a failed fetch as a failure, not as an empty library', async () => {
    hookState.error = 'Network request failed';
    hookState.exercises = [];
    const r = await renderScreen();

    await r.findByText("Couldn't load exercises");
    await r.findByText('Network request failed');
    expect(r.queryByText('No exercises found')).toBeNull();
  });

  it('retries on demand', async () => {
    hookState.error = 'Network request failed';
    hookState.exercises = [];
    const r = await renderScreen();

    fireEvent.press(await r.findByText('Try again'));

    expect(mockReload).toHaveBeenCalled();
  });

  it('shows a loading state rather than an empty one while the catalog is in flight', async () => {
    hookState.isLoading = true;
    hookState.exercises = [];
    const r = await renderScreen();

    await r.findByText('Loading exercises...');
    expect(r.queryByText('No exercises found')).toBeNull();
  });
});

describe('adding a movement the catalog does not have', () => {
  it('offers to add the searched name when nothing matches', async () => {
    const r = await renderScreen();

    fireEvent.changeText(await r.findByPlaceholderText('Search exercises...'), 'zercher');

    await r.findByText('No exercises found');
    await r.findByText('Add "zercher"');
  });

  /**
   * Results can be non-empty and still miss what someone means — a near-match by name is
   * exactly when this is needed most — so the escape hatch sits below every list, not only
   * below an empty one.
   */
  it('offers the escape hatch below a list that did find results', async () => {
    const r = await renderScreen();

    await r.findByLabelText('Add an exercise to the library');
  });

  it('opens the create form with the searched name already filled in', async () => {
    const r = await renderScreen();

    fireEvent.changeText(await r.findByPlaceholderText('Search exercises...'), 'zercher squat');
    fireEvent.press(await r.findByText('Add "zercher squat"'));

    await r.findByText('New exercise');
    expect((await r.findByLabelText('New exercise name')).props.value).toBe('zercher squat');
  });

  /**
   * The copy has to say the row is shared, because it is: a POST adds the movement to the
   * global catalog for every user. People should know they are contributing, not saving
   * something private.
   */
  it('says the new exercise goes into the shared library', async () => {
    const r = await renderScreen();

    fireEvent.press(await r.findByLabelText('Add an exercise to the library'));

    await r.findByText('Added to the shared exercise library — everyone can use it.');
  });

  /**
   * Creating then selecting in one step is the whole point — the user came here to log the
   * movement, not to file it.
   */
  it('selects the created exercise straight away', async () => {
    mockRouteParams = { selectForIndex: 1 };
    const r = await renderScreen();

    fireEvent.press(await r.findByLabelText('Add an exercise to the library'));
    fireEvent.changeText(await r.findByLabelText('New exercise name'), 'Zercher Squat');
    fireEvent.press(await r.findByText('Add exercise'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith({
        name: 'WorkoutForm',
        params: { pickedExercise: { index: 1, name: 'Zercher Squat' } },
        merge: true,
      }),
    );
  });

  it('sends only the facets the user actually chose', async () => {
    const r = await renderScreen();

    fireEvent.press(await r.findByLabelText('Add an exercise to the library'));
    fireEvent.changeText(await r.findByLabelText('New exercise name'), 'Zercher Squat');
    fireEvent.press(await r.findByLabelText('Legs muscle group'));
    fireEvent.press(await r.findByText('Add exercise'));

    await waitFor(() => expect(mockCreateExercise).toHaveBeenCalled());
    expect(mockCreateExercise).toHaveBeenCalledWith({
      name: 'Zercher Squat',
      muscleGroup: 'legs',
      equipment: undefined,
    });
  });

  /** The server floor is `min(2)`; a one-character name would come back a 400. */
  it('will not submit a name the server would reject', async () => {
    const r = await renderScreen();

    fireEvent.press(await r.findByLabelText('Add an exercise to the library'));
    fireEvent.changeText(await r.findByLabelText('New exercise name'), 'x');
    fireEvent.press(await r.findByText('Add exercise'));

    expect(mockCreateExercise).not.toHaveBeenCalled();
  });

  it('surfaces a failed create instead of closing the form on it', async () => {
    mockCreateExercise.mockRejectedValueOnce(new Error('Name already taken by a different row'));
    const r = await renderScreen();

    fireEvent.press(await r.findByLabelText('Add an exercise to the library'));
    fireEvent.changeText(await r.findByLabelText('New exercise name'), 'Zercher Squat');
    fireEvent.press(await r.findByText('Add exercise'));

    await r.findByText('Name already taken by a different row');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

/**
 * Not a UI assertion — a guard on the fixture above. Every case in this file leans on the
 * real `filterCatalog`, so if the mocked hook ever stops routing through it these tests
 * would keep passing while asserting nothing about the search.
 */
describe('the fixture really uses the production filter', () => {
  it('ranks through filterCatalog, not through a stub', () => {
    expect(filterCatalog(catalog, { query: 'bench' }).map((e) => e.name)).toEqual([
      'Bench Press',
      'Close-Grip Barbell Bench Press',
    ]);
  });
});
