import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button, Card } from '../components/ui';
import { SearchBar } from '../components/shared/SearchBar';
import { FilterChip } from '../components/shared/FilterChip';
import { ExerciseThumbnail } from '../components/shared/ExerciseThumbnail';
import { EmptyState } from '../components/shared/EmptyState';
import { LoadingView } from '../components/shared/LoadingView';
import { useDebounce } from '../hooks/useDebounce';
import {
  useExercises,
  exerciseFacetLabel,
  EQUIPMENT_FILTERS,
  EQUIPMENT_LABELS,
  MUSCLE_FILTERS,
  MUSCLE_LABELS,
  type CatalogExercise,
} from '../hooks/useExercises';
import { MobileScreen } from '../components/shared/MobileScreen';
import { fonts, radius, spacing } from '../theme';
import { useThemedStyles } from '../theme/useThemedStyles';

/**
 * How long the search box waits before re-filtering.
 *
 * The catalog is ~900 rows and `filterCatalog` sorts the matches, so an unthrottled
 * `onChangeText` runs that whole pass on every keystroke on a phone CPU. 200ms is below the
 * gap between two typed characters and well under the ~400ms at which a list stops feeling
 * attached to the keyboard. The visible input is never debounced — only what it filters.
 */
const SEARCH_DEBOUNCE_MS = 200;

/** Server floor for a user-contributed name: `createCustomExerciseSchema`, `min(2)`. */
const MIN_CUSTOM_NAME_LENGTH = 2;
/** Server ceiling for the same field: `max(80)`. */
const MAX_CUSTOM_NAME_LENGTH = 80;

/**
 * What the picker hands back to the screen that opened it.
 *
 * Passed as a route param rather than a callback. React Navigation warns about
 * non-serializable params for good reason — a function in the navigation state breaks state
 * persistence and deep linking — and "navigate back to the previous screen with a result"
 * is the pattern its own docs prescribe for exactly this. `index` travels with the name
 * because the workout form has N exercise rows and the pick belongs to one of them; an
 * index past the end means "append", which is how the form's "Add from library" button
 * reaches this without first creating a blank row.
 */
export interface PickedExercise {
  index: number;
  name: string;
}

export interface ExercisesScreenParams {
  /**
   * Present in picker mode: the exercise row the chosen movement belongs to. Absent in
   * browse mode, which is the difference between the two — there is no separate flag,
   * because a flag and an index could disagree.
   */
  selectForIndex?: number;
  /** Route to hand the pick back to. Defaults to the workout form, the only caller today. */
  returnTo?: string;
}

/**
 * One catalog row.
 *
 * `React.memo` is not premature here: this renders inside a `FlatList` over ~900 items, and
 * every keystroke in the search box produces a new filtered array. Without it, each of the
 * mounted rows re-renders on every character even when its own exercise did not change.
 * `onSelect` is memoised in the parent so the comparison actually holds.
 */
const ExerciseRow = React.memo(function ExerciseRow({
  exercise,
  onSelect,
  actionVerb,
}: {
  exercise: CatalogExercise;
  onSelect: (exercise: CatalogExercise) => void;
  /** Leads the spoken label: "Select Bench Press" / "Log Bench Press". */
  actionVerb: string;
}) {
  const styles = useThemedStyles((colors) => ({
    card: { marginBottom: spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: 10,
    },
    text: { flex: 1, minWidth: 0 },
    name: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
    facets: {
      marginTop: spacing.xxs,
      color: colors.textMuted,
    },
  }));

  const facets = exerciseFacetLabel(exercise);

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={() => onSelect(exercise)}
        style={styles.row}
        accessibilityRole="button"
        // The facets are read out too: "Bench Press" alone does not say which of the four
        // bench variations in the catalog this row is.
        accessibilityLabel={`${actionVerb} ${exercise.name}${facets ? `, ${facets}` : ''}`}
      >
        <ExerciseThumbnail imageUrl={exercise.imageUrl} />
        <View style={styles.text}>
          <Text variant="bodyMedium" style={styles.name} numberOfLines={1}>
            {exercise.name}
          </Text>
          {!!facets && (
            <Text variant="bodySmall" style={styles.facets} numberOfLines={1}>
              {facets}
            </Text>
          )}
        </View>
      </Pressable>
    </Card>
  );
});

/**
 * Add a movement the catalog does not have.
 *
 * Three fields, deliberately: a name the user has usually already typed into the search
 * box, and the two facets the list filters on. A new exercise with no muscle group is
 * invisible behind any filter chip, which is why they are offered here rather than left to
 * an edit screen that does not exist.
 *
 * Both facets are optional on the server (`createCustomExerciseSchema`) and stay optional
 * here. Requiring them would block the one case this form exists for: someone mid-workout
 * who wants the movement logged now.
 *
 * The copy says the exercise is shared, because it is — a POST adds the row to the global
 * catalog for every user (`backend/src/services/exercise.ts`). People should know they are
 * contributing, not saving something private.
 */
function CreateExerciseForm({
  initialName,
  isCreating,
  error,
  onCancel,
  onCreate,
}: {
  initialName: string;
  isCreating: boolean;
  error: string | null;
  onCancel: () => void;
  onCreate: (values: { name: string; muscleGroup?: string; equipment?: string }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [muscleGroup, setMuscleGroup] = useState<string | undefined>();
  const [equipment, setEquipment] = useState<string | undefined>();

  const styles = useThemedStyles((colors) => ({
    intro: { color: colors.textMuted },
    label: {
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      color: colors.textMuted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    error: { marginTop: spacing.md, color: colors.danger },
    actions: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
    submit: { flex: 1 },
  }));

  const trimmed = name.trim();
  const canSubmit = trimmed.length >= MIN_CUSTOM_NAME_LENGTH && !isCreating;

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Text variant="bodySmall" style={styles.intro}>
        Added to the shared exercise library — everyone can use it.
      </Text>

      <TextInput
        mode="outlined"
        label="Name"
        // Paper's `label` is the floating visual label and is not forwarded to
        // accessibility, so without this a screen reader announces an unlabelled field.
        accessibilityLabel="New exercise name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Zercher Squat"
        maxLength={MAX_CUSTOM_NAME_LENGTH}
        autoCapitalize="words"
        autoCorrect={false}
      />

      <Text variant="labelSmall" style={styles.label}>Muscle group</Text>
      <View style={styles.chipWrap}>
        {MUSCLE_FILTERS.map((mg) => (
          <FilterChip
            key={mg}
            label={MUSCLE_LABELS[mg] ?? mg}
            selected={muscleGroup === mg}
            onPress={() => setMuscleGroup(muscleGroup === mg ? undefined : mg)}
            accessibilityLabel={`${MUSCLE_LABELS[mg] ?? mg} muscle group`}
          />
        ))}
      </View>

      <Text variant="labelSmall" style={styles.label}>Equipment</Text>
      <View style={styles.chipWrap}>
        {EQUIPMENT_FILTERS.map((eq) => (
          <FilterChip
            key={eq}
            label={EQUIPMENT_LABELS[eq] ?? eq}
            selected={equipment === eq}
            onPress={() => setEquipment(equipment === eq ? undefined : eq)}
            accessibilityLabel={`${EQUIPMENT_LABELS[eq] ?? eq} equipment`}
          />
        ))}
      </View>

      {!!error && (
        <Text variant="bodySmall" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}

      <View style={styles.actions}>
        <Button
          mode="contained"
          style={styles.submit}
          disabled={!canSubmit}
          loading={isCreating}
          onPress={() => onCreate({ name: trimmed, muscleGroup, equipment })}
        >
          Add exercise
        </Button>
        <Button mode="outlined" onPress={onCancel}>
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}

/**
 * The exercise library.
 *
 * **Parity note.** The web has no exercises *page* — its catalog is reachable only through
 * `ExercisePickerSheet`, a bottom sheet the workout editor opens
 * (`frontend/src/components/body/WorkoutModal.tsx`). This screen is that sheet's contents,
 * with the same search box, the same two facet rows, the same ranked results and the same
 * "can't find it? add it" escape hatch — but mounted as a route, so it serves both jobs:
 *
 *   - **Picker mode** (`selectForIndex` is a number): opened from `WorkoutFormScreen`,
 *     hands the chosen movement back to the exercise row that asked for it. This is the
 *     web's behaviour, and it is the reason the screen exists — before it, the only way to
 *     name an exercise on this client was to type it free-hand into a `TextInput`, which is
 *     how a workout ends up logged as "bench pres" and matching nothing in the catalog.
 *   - **Browse mode** (no `selectForIndex`): reached from the Workouts screen. Tapping a
 *     row opens a new workout with that movement already filled in, so the catalog is a
 *     starting point rather than a read-only encyclopedia with no tappable rows.
 *
 * One screen rather than two because the difference between them is one line at the point
 * of selection; two screens would be two copies of the search, the chips, the empty states
 * and the create form.
 *
 * **Why a `FlatList` rather than the web's "show 40 more" button.** The web pages its
 * results by hand because a browser renders every row it is given. React Native
 * virtualises, so the platform already solves the problem the button was working around,
 * and a manual page size on top of a virtualised list is a cap with no upside.
 */
export function ExercisesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? {}) as ExercisesScreenParams;
  const selectForIndex = params.selectForIndex;
  const returnTo = params.returnTo ?? 'WorkoutForm';
  const picking = typeof selectForIndex === 'number';

  const { isLoading, error, reload, refetch, filterExercises, createExercise, isCreating, exercises } =
    useExercises();

  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState<string | undefined>();
  const [muscleGroup, setMuscleGroup] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  const styles = useThemedStyles((colors) => ({
    screen: { flex: 1 },
    // `flexGrow: 0` keeps each chip row sized to its own content rather than letting it
    // stretch and eat the list's vertical space.
    chipScroll: { flexGrow: 0 },
    chipRow: { gap: spacing.sm, paddingRight: spacing.lg },
    count: {
      color: colors.textMuted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      fontFamily: fonts.bold,
      fontWeight: '700',
      marginBottom: spacing.sm,
    },
    list: { flex: 1 },
    addFooter: {
      minHeight: 44,
      marginTop: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
    },
    addFooterLabel: {
      color: colors.textMuted,
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
  }));

  // `filterExercises` changes identity only when the catalog does, so a retry that lands
  // after `isLoading` already went false still recomputes this.
  const results = useMemo(
    () => filterExercises({ query: debouncedQuery, equipment, muscleGroup }),
    [filterExercises, debouncedQuery, equipment, muscleGroup],
  );

  const hasFilters = Boolean(query.trim() || equipment || muscleGroup);

  /**
   * Hand the pick back, or start a workout from it.
   *
   * `merge: true` matters: the workout form may already be holding a half-typed title and
   * duration, and navigating to it with a bare params object would replace them. Merging
   * adds `pickedExercise` beside whatever is already there.
   */
  const handleSelect = useCallback(
    (exercise: CatalogExercise) => {
      const picked: PickedExercise = { index: picking ? (selectForIndex as number) : 0, name: exercise.name };
      navigation.navigate({ name: returnTo, params: { pickedExercise: picked }, merge: true });
    },
    [navigation, picking, selectForIndex, returnTo],
  );

  const handleCreate = useCallback(
    async (values: { name: string; muscleGroup?: string; equipment?: string }) => {
      setCreateError(null);
      try {
        // Selecting straight after creating is the whole point — the user came here to log
        // this movement, not to file it. A name already in the catalog comes back as that
        // existing row, so they still leave with something usable.
        const created = await createExercise(values);
        setCreating(false);
        handleSelect(created);
      } catch (e) {
        setCreateError(
          e instanceof Error ? e.message : 'Could not add the exercise. Please try again.',
        );
      }
    },
    [createExercise, handleSelect],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      // `finally`, so a rejected refetch still clears the spinner — the failure is already
      // on the query's `error`, and a spinning wheel would claim we were still trying.
      setRefreshing(false);
    }
  }, [refetch]);

  const startCreating = useCallback(() => {
    setCreateError(null);
    setCreating(true);
  }, []);

  const title = creating ? 'New exercise' : picking ? 'Choose an exercise' : 'Exercise library';
  const subtitle = creating
    ? undefined
    : picking
      ? 'Pick a movement to log for this set.'
      : 'Browse every movement. Tap one to start logging it.';

  const body = () => {
    if (creating) {
      return (
        <CreateExerciseForm
          initialName={query.trim()}
          isCreating={isCreating}
          error={createError}
          onCancel={() => {
            setCreating(false);
            setCreateError(null);
          }}
          onCreate={handleCreate}
        />
      );
    }

    if (isLoading) return <LoadingView message="Loading exercises..." />;

    // A failed fetch used to be indistinguishable from an empty catalog on the web, which
    // told the user their exercise does not exist rather than that nothing arrived. Its own
    // state, with its own retry.
    if (error) {
      return (
        <EmptyState
          icon="wifi-off"
          title="Couldn't load exercises"
          subtitle={error}
          actionLabel="Try again"
          onAction={reload}
        />
      );
    }

    if (results.length === 0) {
      return (
        <EmptyState
          icon={exercises.length === 0 ? 'dumbbell' : undefined}
          title={exercises.length === 0 ? 'No exercises yet' : 'No exercises found'}
          subtitle={
            hasFilters
              ? 'Try a different search or clear a filter — or add this movement to the library.'
              : 'The exercise library is empty.'
          }
          actionLabel={query.trim() ? `Add "${query.trim()}"` : 'Add a custom exercise'}
          onAction={startCreating}
        />
      );
    }

    return (
      <FlatList
        style={styles.list}
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExerciseRow
            exercise={item}
            onSelect={handleSelect}
            actionVerb={picking ? 'Select' : 'Log'}
          />
        )}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={handleRefresh}
        // Sized so the first screenful paints without rendering 900 rows; the rest arrive
        // as the list scrolls.
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <Text variant="labelSmall" style={styles.count}>
            {results.length} {results.length === 1 ? 'exercise' : 'exercises'}
          </Text>
        }
        // Results can be non-empty and still miss what the user means — a near-match by
        // name is exactly when someone needs this most, so it sits below every list rather
        // than only below an empty one.
        ListFooterComponent={
          <Pressable
            style={styles.addFooter}
            onPress={startCreating}
            accessibilityRole="button"
            accessibilityLabel="Add an exercise to the library"
          >
            <Text variant="labelMedium" style={styles.addFooterLabel}>
              Can't find it? Add an exercise
            </Text>
          </Pressable>
        }
      />
    );
  };

  return (
    <MobileScreen title={title} subtitle={subtitle} scroll={false} contentStyle={styles.screen}>
      {/* Search and facets belong to browsing; while the create form is open they would
          compete with that form's own chips for the same taps. */}
      {!creating && (
        <>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search exercises..." />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
            accessibilityLabel="Filter exercises by equipment"
          >
            <FilterChip
              label="All gear"
              selected={!equipment}
              onPress={() => setEquipment(undefined)}
              accessibilityLabel="All equipment"
            />
            {EQUIPMENT_FILTERS.map((eq) => (
              <FilterChip
                key={eq}
                label={EQUIPMENT_LABELS[eq] ?? eq}
                selected={equipment === eq}
                onPress={() => setEquipment(equipment === eq ? undefined : eq)}
                accessibilityLabel={`${EQUIPMENT_LABELS[eq] ?? eq} exercises`}
              />
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
            accessibilityLabel="Filter exercises by muscle group"
          >
            <FilterChip
              label="All muscles"
              selected={!muscleGroup}
              onPress={() => setMuscleGroup(undefined)}
              accessibilityLabel="All muscle groups"
            />
            {MUSCLE_FILTERS.map((mg) => (
              <FilterChip
                key={mg}
                label={MUSCLE_LABELS[mg] ?? mg}
                selected={muscleGroup === mg}
                onPress={() => setMuscleGroup(muscleGroup === mg ? undefined : mg)}
                accessibilityLabel={`${MUSCLE_LABELS[mg] ?? mg} exercises`}
              />
            ))}
          </ScrollView>
        </>
      )}

      {body()}
    </MobileScreen>
  );
}
