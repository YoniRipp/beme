import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { Button } from '../components/ui';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';
import { messageFor } from '../lib/errorMessage';
import { DayPicker } from '../components/shared/DayPicker';
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
 * The chosen day's entry if there is one, so the field EDITS that day rather than silently
 * replacing it
 * with a number typed from scratch; otherwise the most recent reading, which is a sensible
 * starting point for a scale that moves in tenths. The web does the same
 * (`WeightLogModal.tsx:30-40`), and its `notes` only carry over from that day's own entry —
 * yesterday's "post-run" note does not belong on today's row.
 */
export function weightFormSeed(
  entries: readonly { date: string; weight: number; notes?: string }[],
  day: string
): { weight: string; notes: string } {
  const dayEntry = entries.find((e) => e.date === day);
  const prefill = dayEntry ?? entries[0];
  return {
    weight: prefill?.weight != null ? String(prefill.weight) : '',
    notes: dayEntry?.notes ?? '',
  };
}

/**
 * The form's field state, and the rule that governs seeding it.
 *
 * Extracted from the screen so it can be exercised with `renderHook` — mounting the screen
 * drags in `useWeight` and a QueryClient, whose leftover notifyManager batch timer hangs the
 * jest run (the same reasoning as `GoalFormScreen.useGoalFormState`).
 *
 * THE RULE: seed once, as soon as there is something to seed from, and never over the user.
 *
 * `useState`'s initialiser runs at mount, when the weight query may not have resolved — the
 * same cold-start hole `useGoalFormState` exists for — so the seed has to be an effect. But
 * an effect that only asks "have I seeded yet" loses a race it will actually lose: open the
 * form from the quick tile on a cold start, type 81.5, and the query resolves a moment later
 * and replaces it with yesterday's reading, which is then what Save posts. A wrong weight
 * written to the log is data corruption, not a display glitch.
 *
 * `edited` closes that: the moment the user touches either field, their value is the one
 * that stands, whenever the query gets back. Refs rather than state because neither is
 * rendered and neither should schedule a render.
 *
 * It governs the day switch too, and in the direction that cannot lose data. Type 81.5,
 * realise it was yesterday's weigh-in, switch to Yesterday — the number you typed is still
 * there and is what Save posts. Re-seeding at that moment would silently replace it with
 * yesterday's stored reading, which is the same class of corruption the race above describes.
 */
export function useWeightFormState(
  entries: readonly { date: string; weight: number; notes?: string }[],
  day: string
) {
  const [weight, setWeightState] = useState('');
  const [notes, setNotesState] = useState('');
  // Which day the fields were last seeded for, rather than a boolean: the day is selectable
  // now, and switching to one that already has a reading must show that reading rather than
  // leave another day's number in the field.
  const seededFor = useRef<string | null>(null);
  const edited = useRef(false);

  useEffect(() => {
    if (edited.current || seededFor.current === day || entries.length === 0) return;
    seededFor.current = day;
    const seed = weightFormSeed(entries, day);
    setWeightState(seed.weight);
    setNotesState(seed.notes);
  }, [entries, day]);

  const setWeight = useCallback((value: string) => {
    edited.current = true;
    setWeightState(value);
  }, []);

  const setNotes = useCallback((value: string) => {
    edited.current = true;
    setNotesState(value);
  }, []);

  return { weight, notes, setWeight, setNotes };
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
  // Captured once per mount, so a form left open across midnight keeps the row it rendered.
  const [today] = useState(() => new Date());
  const [date, setDate] = useState(today);
  const day = toLocalDateString(date);

  const { weight, notes, setWeight, setNotes } = useWeightFormState(weightEntries, day);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const value = Number(weight);
    if (!weight || !isValidWeight(value)) {
      Toast.show({ type: 'error', text1: 'Please enter a valid weight' });
      return;
    }
    setSaving(true);
    try {
      await addWeight({ date: day, weight: value, notes: notes || undefined });
      Toast.show({ type: 'success', text1: 'Weight saved' });
      navigation.goBack();
    } catch (error) {
      Toast.show({ type: 'error', text1: messageFor(error, 'Could not save weight') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <DayPicker value={date} onChange={setDate} today={today} />
        <Text variant="bodyMedium" style={styles.date}>
          {format(parseLocalDateString(day), 'EEEE, MMMM d, yyyy')}
        </Text>
        <TextInput
          mode="outlined"
          label="Weight"
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="e.g. 70.5"
          right={<TextInput.Affix text="kg" />}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
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
