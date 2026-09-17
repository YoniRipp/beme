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
    exerciseInput: { marginBottom: 8 },
    exerciseRow: { flexDirection: 'row', gap: 8 },
    exerciseSmall: { flex: 1 },
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
                {exercises.length > 1 && (
                  <IconButton icon="close" size={18} onPress={() => removeExercise(i)} />
                )}
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
