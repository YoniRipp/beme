import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, SegmentedButtons, Text, IconButton, Divider, Card } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useWorkouts } from '../hooks/useWorkouts';
import { WorkoutType, Exercise, WORKOUT_TYPES } from '../types/workout';
import { toLocalDateString } from '../lib/dateRanges';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';

function newExercise(): Exercise {
  return { name: '', sets: 3, reps: 10, weight: undefined, notes: undefined };
}

export function WorkoutFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const workoutId = route.params?.workoutId;
  const { getWorkoutById, addWorkout, updateWorkout } = useWorkouts();
  const existing = workoutId ? getWorkoutById(workoutId) : undefined;

  const [title, setTitle] = useState(existing?.title || 'Workout');
  const [type, setType] = useState<WorkoutType>(existing?.type || 'strength');
  const [date] = useState(existing?.date || new Date());
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
    if (validExercises.length === 0) {
      Toast.show({ type: 'error', text1: 'Add at least one exercise' });
      return;
    }
    setSaving(true);
    try {
      const data = {
        title: title.trim() || 'Workout',
        type,
        date,
        durationMinutes: parseInt(duration) || 0,
        exercises: validExercises.map((e) => ({
          name: e.name.trim(),
          sets: e.sets || 3,
          reps: e.reps || 10,
          weight: e.weight || undefined,
          notes: e.notes || undefined,
        })),
        notes: notes.trim() || undefined,
      };
      if (existing) {
        await updateWorkout(existing.id, data);
      } else {
        await addWorkout(data);
      }
      Toast.show({ type: 'success', text1: existing ? 'Workout updated' : 'Workout logged' });
      navigation.goBack();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save workout' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput mode="outlined" label="Title" value={title} onChangeText={setTitle} style={styles.input} />

        <Text variant="titleSmall" style={styles.label}>Type</Text>
        <SegmentedButtons
          value={type}
          onValueChange={(v) => setType(v as WorkoutType)}
          buttons={WORKOUT_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
          style={styles.segment}
        />

        <TextInput
          mode="outlined"
          label="Date"
          value={format(date, 'EEE, MMM d, yyyy')}
          editable={false}
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Duration (minutes)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
          style={styles.input}
        />

        <Divider style={styles.divider} />
        <Text variant="titleMedium" style={styles.label}>Exercises</Text>

        {exercises.map((ex, i) => (
          <Card key={i} style={styles.exerciseCard} mode="outlined">
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
                value={ex.name}
                onChangeText={(v) => updateExercise(i, 'name', v)}
                dense
                style={styles.exerciseInput}
              />
              <View style={styles.exerciseRow}>
                <TextInput
                  mode="outlined"
                  label="Sets"
                  value={ex.sets?.toString() || ''}
                  onChangeText={(v) => updateExercise(i, 'sets', parseInt(v) || 0)}
                  keyboardType="numeric"
                  dense
                  style={styles.exerciseSmall}
                />
                <TextInput
                  mode="outlined"
                  label="Reps"
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  input: { marginBottom: 12 },
  label: { marginTop: 8, marginBottom: 8, fontWeight: '600' },
  segment: { marginBottom: 12 },
  divider: { marginVertical: 16 },
  exerciseCard: { marginBottom: 12 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseInput: { marginBottom: 8 },
  exerciseRow: { flexDirection: 'row', gap: 8 },
  exerciseSmall: { flex: 1 },
  addExercise: { marginTop: 8, marginBottom: 16 },
  saveButton: { marginTop: 8, backgroundColor: '#3b82f6' },
});
