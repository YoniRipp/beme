import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, SegmentedButtons, RadioButton, Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGoals } from '../hooks/useGoals';
import { GoalType, GoalPeriod, GOAL_TYPES, GOAL_PERIODS } from '../types/goals';
import Toast from 'react-native-toast-message';

export function GoalFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const goalId = route.params?.goalId;
  const { getGoalById, addGoal, updateGoal } = useGoals();

  const existingGoal = goalId ? getGoalById(goalId) : undefined;

  const [type, setType] = useState<GoalType>(existingGoal?.type || 'workouts');
  const [target, setTarget] = useState(existingGoal?.target?.toString() || '');
  const [period, setPeriod] = useState<GoalPeriod>(existingGoal?.period || 'weekly');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: existingGoal ? 'Edit Goal' : 'New Goal' });
  }, [existingGoal, navigation]);

  const handleSave = async () => {
    const targetNum = parseFloat(target);
    if (!target || isNaN(targetNum) || targetNum <= 0) {
      Toast.show({ type: 'error', text1: 'Please enter a valid target' });
      return;
    }
    setSaving(true);
    try {
      if (existingGoal) {
        await updateGoal(existingGoal.id, { type, target: targetNum, period });
      } else {
        await addGoal({ type, target: targetNum, period });
      }
      Toast.show({ type: 'success', text1: existingGoal ? 'Goal updated' : 'Goal created' });
      navigation.goBack();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save goal' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text variant="titleMedium" style={styles.label}>Goal Type</Text>
        <SegmentedButtons
          value={type}
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
          value={target}
          onChangeText={setTarget}
          keyboardType="numeric"
          placeholder={type === 'calories' ? 'e.g. 2000' : type === 'sleep' ? 'e.g. 8' : 'e.g. 4'}
          right={<TextInput.Affix text={type === 'calories' ? 'cal' : type === 'sleep' ? 'hrs' : 'workouts'} />}
          style={styles.input}
        />

        <Text variant="titleMedium" style={styles.label}>Period</Text>
        <RadioButton.Group onValueChange={(v) => setPeriod(v as GoalPeriod)} value={period}>
          {GOAL_PERIODS.map((p) => (
            <RadioButton.Item key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} value={p} />
          ))}
        </RadioButton.Group>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
        >
          {existingGoal ? 'Update Goal' : 'Create Goal'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  label: { marginTop: 16, marginBottom: 8, fontWeight: '600' },
  segment: { marginBottom: 8 },
  input: { marginBottom: 8 },
  saveButton: { marginTop: 24, backgroundColor: '#3b82f6' },
});
