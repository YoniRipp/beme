import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, SegmentedButtons, RadioButton, Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { defaultPeriodForType } from '@trackvibe/shared/domain';
import { useGoals } from '../hooks/useGoals';
import { GoalType, GoalPeriod, GOAL_TYPES, GOAL_PERIODS, Goal } from '../types/goals';
import { useThemedStyles } from '../theme/useThemedStyles';
import Toast from 'react-native-toast-message';

/**
 * A new goal starts as a daily calories goal, matching the web's GoalModal. This form used
 * to start on workouts/weekly, so the same button produced a different row on each client.
 */
const NEW_GOAL_TYPE: GoalType = 'calories';

export interface GoalFormValues {
  type: GoalType;
  target: string;
  period: GoalPeriod;
}

/** The form's state for a brand-new goal — the web's defaults. */
export function newGoalFormValues(): GoalFormValues {
  return { type: NEW_GOAL_TYPE, target: '', period: defaultPeriodForType(NEW_GOAL_TYPE) };
}

/** The form's state for an existing goal being edited. */
export function goalFormValues(goal: Goal): GoalFormValues {
  return { type: goal.type, target: goal.target.toString(), period: goal.period };
}

/**
 * The form's field state, and the two rules that govern it. Extracted from the screen so
 * both can be exercised with `renderHook` — the screen itself pulls in `useGoals`, and a
 * QueryClient left over in a jest run leaves a notifyManager batch timer that hangs the
 * suite (see hooks/useWorkouts.ts's buildWorkoutUpdateBody for the same reasoning).
 *
 * RULE 1 — re-seed when the goal arrives. THE BUG THIS EXISTS FOR: `useState` seeds once,
 * at mount. Navigating straight to Edit before the goals query has resolved (a cold start
 * into a restored navigation state, or a dropped cache) left `existingGoal` undefined, so
 * the form initialised to the *create* defaults. When the goal arrived a moment later
 * nothing re-read it — only the header title updated. Typing a target and pressing "Update
 * Goal" then PATCHed those defaults over the real goal, silently turning a monthly calories
 * goal into a weekly workouts one. The web's GoalModal has had this effect all along (its
 * `useEffect` on `[goal, open]`); this screen did not.
 *
 * It is keyed on the goal's *identity*, not on the object, so a background refetch that
 * returns an equal-but-new object cannot wipe out what the user is currently typing.
 *
 * RULE 2 — picking a type on a NEW goal moves the period to that type's default, matching
 * the web. Editing leaves the period alone: the web guards this with `!goal && …`, because
 * a user who deliberately chose "monthly" should not lose it by re-tapping the type.
 */
export function useGoalFormState(existingGoal: Goal | undefined) {
  const [form, setForm] = useState<GoalFormValues>(() =>
    existingGoal ? goalFormValues(existingGoal) : newGoalFormValues()
  );
  const seededGoalId = useRef<string | null>(existingGoal?.id ?? null);

  useEffect(() => {
    if (!existingGoal) return;
    if (seededGoalId.current === existingGoal.id) return;
    seededGoalId.current = existingGoal.id;
    setForm(goalFormValues(existingGoal));
  }, [existingGoal]);

  const isEdit = !!existingGoal;

  const setType = useCallback(
    (type: GoalType) =>
      setForm((prev) => ({ ...prev, type, period: isEdit ? prev.period : defaultPeriodForType(type) })),
    [isEdit]
  );
  const setTarget = useCallback((target: string) => setForm((prev) => ({ ...prev, target })), []);
  const setPeriod = useCallback((period: GoalPeriod) => setForm((prev) => ({ ...prev, period })), []);

  return { form, setType, setTarget, setPeriod };
}

export function GoalFormScreen() {
  const styles = useThemedStyles((colors) => ({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    label: { marginTop: 16, marginBottom: 8, fontWeight: '600' },
    segment: { marginBottom: 8 },
    input: { marginBottom: 8 },
    saveButton: { marginTop: 24, backgroundColor: colors.primary },
  }));
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const goalId = route.params?.goalId;
  const { getGoalById, addGoal, updateGoal } = useGoals();

  const existingGoal = goalId ? getGoalById(goalId) : undefined;

  const { form, setType, setTarget, setPeriod } = useGoalFormState(existingGoal);
  const [saving, setSaving] = useState(false);

  // Keyed on the route param, not on the resolved goal: an edit that is still loading is
  // still an edit, and the header used to say "New Goal" until the query came back.
  useEffect(() => {
    navigation.setOptions({ title: goalId ? 'Edit Goal' : 'New Goal' });
  }, [goalId, navigation]);

  const handleSave = async () => {
    const targetNum = parseFloat(form.target);
    if (!form.target || isNaN(targetNum) || targetNum <= 0) {
      Toast.show({ type: 'error', text1: 'Please enter a valid target' });
      return;
    }
    setSaving(true);
    try {
      const payload = { type: form.type, target: targetNum, period: form.period };
      if (existingGoal) {
        await updateGoal(existingGoal.id, payload);
      } else {
        await addGoal(payload);
      }
      Toast.show({ type: 'success', text1: existingGoal ? 'Goal updated' : 'Goal created' });
      navigation.goBack();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save goal' });
    } finally {
      setSaving(false);
    }
  };

  /**
   * An edit whose goal has not arrived yet cannot be saved: the form would be showing —
   * and would PATCH — the create defaults rather than the goal's own values. Disabling
   * the control is the honest state for that moment; the effect above fills the form in
   * as soon as the query resolves.
   */
  const awaitingGoal = !!goalId && !existingGoal;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text variant="titleMedium" style={styles.label}>Goal Type</Text>
        <SegmentedButtons
          value={form.type}
          onValueChange={(v) => setType(v as GoalType)}
          buttons={GOAL_TYPES.map((t) => ({
            value: t,
            label: t.charAt(0).toUpperCase() + t.slice(1),
            icon: t === 'workouts' ? 'dumbbell' : t === 'calories' ? 'fire' : 'moon-waning-crescent',
          }))}
          style={styles.segment}
        />

        <Text variant="titleMedium" style={styles.label}>Target</Text>
        <TextInput
          mode="outlined"
          value={form.target}
          onChangeText={setTarget}
          keyboardType="numeric"
          placeholder={form.type === 'calories' ? 'e.g. 2000' : form.type === 'sleep' ? 'e.g. 8' : 'e.g. 4'}
          right={<TextInput.Affix text={form.type === 'calories' ? 'cal' : form.type === 'sleep' ? 'hrs' : 'workouts'} />}
          style={styles.input}
        />

        <Text variant="titleMedium" style={styles.label}>Period</Text>
        <RadioButton.Group
          onValueChange={(v) => setPeriod(v as GoalPeriod)}
          value={form.period}
        >
          {GOAL_PERIODS.map((p) => (
            <RadioButton.Item key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} value={p} />
          ))}
        </RadioButton.Group>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving || awaitingGoal}
          disabled={saving || awaitingGoal}
          style={styles.saveButton}
        >
          {goalId ? 'Update Goal' : 'Create Goal'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
