import React, { useEffect, useRef, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';
import { useWeight } from '../hooks/useWeight';
import { toLocalDateString, parseLocalDateString } from '../lib/dateRanges';
import { useThemedStyles } from '../theme/useThemedStyles';

/** The web's accepted range (`frontend/src/components/home/WeightLogModal.tsx:44`), in kg. */
export const MIN_WEIGHT_KG = 10;
export const MAX_WEIGHT_KG = 500;

export function isValidWeight(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_WEIGHT_KG && value <= MAX_WEIGHT_KG;
}

/**
 * What the form should open with.
 *
 * Today's entry if there is one, so the field EDITS today rather than silently replacing it
 * with a number typed from scratch; otherwise the most recent reading, which is a sensible
 * starting point for a scale that moves in tenths. The web does the same
 * (`WeightLogModal.tsx:30-40`), and its `notes` only carry over from today's own entry —
 * yesterday's "post-run" note does not belong on today's row.
 */
export function weightFormSeed(
  entries: readonly { date: string; weight: number; notes?: string }[],
  today: string
): { weight: string; notes: string } {
  const todaysEntry = entries.find((e) => e.date === today);
  const prefill = todaysEntry ?? entries[0];
  return {
    weight: prefill?.weight != null ? String(prefill.weight) : '',
    notes: todaysEntry?.notes ?? '',
  };
}

/**
 * Log today's weight.
 *
 * A stack screen with `presentation: 'modal'`, matching how Expo already does forms
 * (`SleepForm`, `GoalForm`) rather than porting the web's `Dialog`. The web's own modal is
 * the reference for the field set, the range and the seeding.
 */
export function WeightFormScreen() {
  const styles = useThemedStyles((colors) => ({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background, padding: 16 },
    date: { color: colors.textMuted, marginBottom: 16 },
    input: { marginBottom: 16 },
    saveButton: { backgroundColor: colors.primary },
  }));
  const navigation = useNavigation<any>();
  const { weightEntries, addWeight } = useWeight();
  const today = toLocalDateString(new Date());

  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const seeded = useRef(false);
  const edited = useRef(false);

  /**
   * Seeds once, as soon as there is something to seed from — and never over the user.
   *
   * `useState`'s initialiser runs at mount, when the weight query may not have resolved:
   * the same cold-start hole `GoalFormScreen.useGoalFormState` exists for. So the seed has
   * to be an effect. But an effect that only checks "have I seeded yet" loses a race it will
   * actually lose — open the form from the quick tile on a cold start, type 81.5, and the
   * query resolves a moment later and replaces it with yesterday's reading, which is then
   * what Save posts.
   *
   * `edited` is what closes that: the moment the user touches either field their value is
   * the one that stands, whenever the query gets back. Refs rather than state because
   * neither is rendered and neither should schedule one.
   */
  useEffect(() => {
    if (seeded.current || edited.current || weightEntries.length === 0) return;
    seeded.current = true;
    const seed = weightFormSeed(weightEntries, today);
    setWeight(seed.weight);
    setNotes(seed.notes);
  }, [weightEntries, today]);

  const onWeightChange = (value: string) => {
    edited.current = true;
    setWeight(value);
  };

  const onNotesChange = (value: string) => {
    edited.current = true;
    setNotes(value);
  };

  const handleSave = async () => {
    const value = Number(weight);
    if (!weight || !isValidWeight(value)) {
      Toast.show({ type: 'error', text1: 'Please enter a valid weight' });
      return;
    }
    setSaving(true);
    try {
      await addWeight({ date: today, weight: value, notes: notes || undefined });
      Toast.show({ type: 'success', text1: 'Weight saved' });
      navigation.goBack();
    } catch {
      Toast.show({ type: 'error', text1: 'Could not save weight' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.date}>
          {format(parseLocalDateString(today), 'EEEE, MMMM d, yyyy')}
        </Text>
        <TextInput
          mode="outlined"
          label="Weight"
          value={weight}
          onChangeText={onWeightChange}
          keyboardType="decimal-pad"
          placeholder="e.g. 70.5"
          right={<TextInput.Affix text="kg" />}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Notes (optional)"
          value={notes}
          onChangeText={onNotesChange}
          placeholder="Morning weigh-in..."
          maxLength={500}
          style={styles.input}
        />
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
        >
          Save
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
