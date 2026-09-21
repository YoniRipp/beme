import React, { useState, useEffect } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, SegmentedButtons, Text, Divider } from 'react-native-paper';
import { Card, Button, IconButton } from '../components/ui';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useWorkouts } from '../hooks/useWorkouts';
import { WorkoutType, Exercise, WORKOUT_TYPES } from '../types/workout';
import { toLocalDateString } from '../lib/dateRanges';
import { workoutFormSchema } from '@trackvibe/shared/schemas';
import { messageFor } from '../lib/errorMessage';
import { DayPicker } from '../components/shared/DayPicker';
import { useThemedStyles } from '../theme/useThemedStyles';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';
import { fonts } from '../theme';

function newExercise(): Exercise {
  return { name: '', sets: 3, reps: 10, weight: undefined, notes: undefined };
}

/**
 * Apply a movement chosen in the exercise library to the row that asked for it.
 *
 * An `index` inside the list renames that row, keeping its sets, reps and weight — the user
 * pressed "choose from library" on a row they had already dialled in, and throwing that away
 * to get a name would be a worse trade than typing the name by hand. An index past the end
 * appends instead, which is how "Add from library" reaches this without first creating a
 * blank row for the user to then fill.
 *
 * Exported as a plain function so the contract can be pinned without a navigator: the whole
 * value here is in "replace, don't rebuild", and a rendered test would assert it through two
 * layers of navigation mock. It is also the same lesson `mergeExerciseEdits` below exists
 * for — rebuilding an exercise from the fields in view is what silently destroyed per-set
 * data once already.
 */
export function applyPickedExercise(exercises: Exercise[], index: number, name: string): Exercise[] {
  if (index >= 0 && index < exercises.length) {
    return exercises.map((ex, i) => (i === index ? { ...ex, name } : ex));
  }
  return [...exercises, { ...newExercise(), name }];
}

/**
 * Apply the five fields this form edits on top of the exercise it is holding.
 *
 * The spread is the whole point: per-set reps, weights and completion flags
 * loaded from the API are not editable here yet, and rebuilding the exercise
 * from the edited fields alone is what used to wipe them on save.
 *
 * Exported for tests.
 */
export function mergeExerciseEdits(e: Exercise): Exercise {
  return {
    ...e,
    name: e.name.trim(),
    sets: e.sets || 3,
    reps: e.reps || 10,
    weight: e.weight || undefined,
    notes: e.notes || undefined,
  };
}

export function WorkoutFormScreen() {
  const styles = useThemedStyles((colors) => ({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    input: { marginBottom: 12 },
    // Spells out the day the chips selected, so "Tuesday" is never ambiguous about which one.
    selectedDate: { color: colors.textMuted, marginBottom: 12 },
    label: { marginTop: 8, marginBottom: 8, fontFamily: fonts.semibold, fontWeight: '600' },
    segment: { marginBottom: 12 },
    divider: { marginVertical: 16 },
    exerciseCard: { marginBottom: 12 },
    exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    exerciseActions: { flexDirection: 'row', alignItems: 'center' },
    exerciseInput: { marginBottom: 8 },
    exerciseRow: { flexDirection: 'row', gap: 8 },
    exerciseSmall: { flex: 1 },
    addFromLibrary: { marginTop: 8 },
    addExercise: { marginTop: 8, marginBottom: 16 },
    saveButton: { marginTop: 8, backgroundColor: colors.primary },
  }));
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const workoutId = route.params?.workoutId;
  const { getWorkoutById, addWorkout, updateWorkout } = useWorkouts();
  const existing = workoutId ? getWorkoutById(workoutId) : undefined;

  const [title, setTitle] = useState(existing?.title || 'Workout');
  const [type, setType] = useState<WorkoutType>(existing?.type || 'strength');
  const [date, setDate] = useState(existing?.date || new Date());
  // Captured once per mount rather than read per render, so the row cannot shift under the
  // user's finger if a form is left open across midnight.
  const [today] = useState(() => new Date());
  const [duration, setDuration] = useState(existing?.durationMinutes?.toString() || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [exercises, setExercises] = useState<Exercise[]>(
    existing?.exercises?.length ? existing.exercises : [newExercise()]
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: existing ? 'Edit Workout' : 'New Workout' });
  }, [existing, navigation]);

  /**
   * Receive a movement chosen in the exercise library.
   *
   * The library hands its result back as a route param rather than through a callback:
   * React Navigation warns about non-serializable params (they break state persistence and
   * deep linking), and "navigate back to the previous screen with a result" is the pattern
   * its own docs prescribe. The param is cleared as soon as it is applied, so re-rendering
   * for any other reason — a keystroke in the title field — cannot apply the same pick
   * twice, and picking the *same* exercise again still arrives as a fresh object and works.
   *
   * `setParams` is called after `setExercises` rather than instead of it: clearing the param
   * is bookkeeping, and doing it first would drop the pick if the state update threw.
   */
  const picked = route.params?.pickedExercise as { index: number; name: string } | undefined;
  useEffect(() => {
    if (!picked) return;
    setExercises((prev) => applyPickedExercise(prev, picked.index, picked.name));
    navigation.setParams({ pickedExercise: undefined });
  }, [picked, navigation]);

  /**
   * Open the library for one exercise row, or (with an index past the end) to append a new
   * one. The picker replaces nothing until the user chooses, so backing out of it leaves
   * the form exactly as it was.
   */
  const openLibrary = (index: number) =>
    navigation.navigate('Exercises', { selectForIndex: index, returnTo: 'WorkoutForm' });

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)));
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const validExercises = exercises.filter((e) => e.name.trim());

    /**
     * Validate before sending, against the schema the web form already uses.
     *
     * The bug this closes: `durationMinutes` was `parseInt(duration) || 0`, and the field
     * starts empty. The backend requires `min(1)` (`routeSchemas.ts`), so leaving duration
     * blank produced a 400 that arrived as "Failed to save workout" — a user could not save a
     * workout and was never told which field was the problem.
     *
     * `workoutFormSchema` already says "Duration is required" and is already in
     * `packages/shared`; nothing had ever imported it here. Its shape is the FORM's, not the
     * API's — `date` and `durationMinutes` are strings — so the raw field values go in, not
     * the payload built below.
     */
    const parsed = workoutFormSchema.safeParse({
      title: title.trim() || 'Workout',
      type,
      date: toLocalDateString(date),
      durationMinutes: duration.trim(),
      notes: notes.trim() || undefined,
      exercises: validExercises.map(mergeExerciseEdits),
    });

    if (!parsed.success) {
      // The first message, not a count. "Duration is required" tells someone what to do;
      // "3 validation errors" does not, and this form has no per-field error slots yet.
      const issue = parsed.error.issues[0];
      Toast.show({ type: 'error', text1: issue?.message ?? 'Check the form and try again' });
      return;
    }

    setSaving(true);
    try {
      const data = {
        title: title.trim() || 'Workout',
        type,
        date,
        durationMinutes: parseInt(duration, 10),
        exercises: validExercises.map(mergeExerciseEdits),
        notes: notes.trim() || undefined,
        completed: existing?.completed ?? false,
      };
      if (existing) {
        await updateWorkout(existing.id, data);
      } else {
        await addWorkout(data);
      }
      Toast.show({ type: 'success', text1: existing ? 'Workout updated' : 'Workout logged' });
      navigation.goBack();
    } catch (error) {
      Toast.show({ type: 'error', text1: messageFor(error, 'Failed to save workout') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          mode="outlined"
          label="Title"
          // Paper's `label` is the floating visual label and is NOT forwarded to accessibility, so
          // without this a screen reader announces an unlabelled text field. Same for every
          // input below.
          accessibilityLabel="Title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        <Text variant="titleSmall" style={styles.label}>Type</Text>
        <SegmentedButtons
          value={type}
          onValueChange={(v) => setType(v as WorkoutType)}
          buttons={WORKOUT_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
          style={styles.segment}
        />

        {/* Was a read-only field showing today, with no setter anywhere — nothing on this
            client could be backdated. */}
        <DayPicker value={date} onChange={setDate} today={today} />
        <Text variant="bodySmall" style={styles.selectedDate}>
          {format(date, 'EEEE, MMMM d, yyyy')}
        </Text>

        <TextInput
          mode="outlined"
          label="Duration (minutes)"
          accessibilityLabel="Duration (minutes)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Notes"
          accessibilityLabel="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
          style={styles.input}
        />

        <Divider style={styles.divider} />
        <Text variant="titleMedium" style={styles.label}>Exercises</Text>

        {exercises.map((ex, i) => (
          <Card key={i} style={styles.exerciseCard}>
            <Card.Content>
              <View style={styles.exerciseHeader}>
                <Text variant="labelLarge">Exercise {i + 1}</Text>
                <View style={styles.exerciseActions}>
                  {/* The catalog route onto a row that already exists. Before this, the
                      only way to name an exercise on this client was to type it free-hand,
                      which is how a workout ends up logged as "bench pres" and matching
                      nothing in the ~900-row library. */}
                  <IconButton
                    icon="magnify"
                    size={18}
                    onPress={() => openLibrary(i)}
                    accessibilityLabel={`Choose exercise ${i + 1} from the library`}
                  />
                  {exercises.length > 1 && (
                    <IconButton
                      icon="close"
                      size={18}
                      onPress={() => removeExercise(i)}
                      accessibilityLabel={`Remove exercise ${i + 1}`}
                    />
                  )}
                </View>
              </View>
              <TextInput
                mode="outlined"
                label="Name"
                accessibilityLabel="Exercise name"
                value={ex.name}
                onChangeText={(v) => updateExercise(i, 'name', v)}
                dense
                style={styles.exerciseInput}
              />
              <View style={styles.exerciseRow}>
                <TextInput
                  mode="outlined"
                  label="Sets"
                  accessibilityLabel="Sets"
                  value={ex.sets?.toString() || ''}
                  onChangeText={(v) => updateExercise(i, 'sets', parseInt(v) || 0)}
                  keyboardType="numeric"
                  dense
                  style={styles.exerciseSmall}
                />
                <TextInput
                  mode="outlined"
                  label="Reps"
                  accessibilityLabel="Reps"
                  value={ex.reps?.toString() || ''}
                  onChangeText={(v) => updateExercise(i, 'reps', parseInt(v) || 0)}
                  keyboardType="numeric"
                  dense
                  style={styles.exerciseSmall}
                />
                <TextInput
                  mode="outlined"
                  label="Weight (kg)"
                  value={ex.weight?.toString() || ''}
                  onChangeText={(v) => updateExercise(i, 'weight', parseFloat(v) || undefined)}
                  keyboardType="numeric"
                  dense
                  style={styles.exerciseSmall}
                />
              </View>
            </Card.Content>
          </Card>
        ))}

        {/* Two ways in, because they answer different questions. "Add from library" is for
            someone who knows the movement but not how this app spells it; "Add Exercise" is
            for someone entering something the catalog does not have, or who simply types
            faster than they browse. The library one leads: a name that matches the catalog
            is what lets a saved workout resolve to a photo and to the user's own history
            for that movement. */}
        <Button
          mode="contained-tonal"
          icon="magnify"
          onPress={() => openLibrary(exercises.length)}
          style={styles.addFromLibrary}
        >
          Add from library
        </Button>

        <Button
          mode="outlined"
          icon="plus"
          onPress={() => setExercises((prev) => [...prev, newExercise()])}
          style={styles.addExercise}
        >
          Add Exercise
        </Button>

        <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.saveButton}>
          {existing ? 'Update Workout' : 'Log Workout'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
