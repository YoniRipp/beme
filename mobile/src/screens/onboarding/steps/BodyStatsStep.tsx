import React from 'react';
import { View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { unitForSystem } from '@trackvibe/shared/domain';
import { bmiFor } from '../../../domain/profileForm';
import { useSettings } from '../../../hooks/useSettings';
import { BmiCard, StepHeading, stepLayout, type StepProps } from './stepShared';

/**
 * Step 3 of 5 — height, current weight, target weight, and the live BMI
 * (`SetupWizard.tsx:132-183`).
 *
 * The weight fields are captioned in the user's own measurement system and converted to
 * kilograms on the way out, because `user_profiles` stores kilograms — see
 * `PROFILE_WEIGHT_UNIT` in `src/domain/profileForm.ts` for why that is a constant here and
 * a per-row column on `weight_entries`. Height stays centimetres on both clients.
 */
export function BodyStatsStep({ form, setField }: StepProps) {
  const { settings } = useSettings();
  const weightUnit = unitForSystem(settings.units);

  return (
    <View>
      <StepHeading>Body Stats</StepHeading>

      <TextInput
        mode="outlined"
        label="Height (cm)"
        accessibilityLabel="Height (cm)"
        keyboardType="numeric"
        placeholder="170"
        value={form.heightCm}
        onChangeText={(value) => setField('heightCm', value)}
        style={stepLayout.field}
      />
      <TextInput
        mode="outlined"
        label={`Current weight (${weightUnit})`}
        accessibilityLabel={`Current weight (${weightUnit})`}
        keyboardType="decimal-pad"
        value={form.currentWeight}
        onChangeText={(value) => setField('currentWeight', value)}
        style={stepLayout.field}
      />
      <TextInput
        mode="outlined"
        label={`Target weight (${weightUnit})`}
        accessibilityLabel={`Target weight (${weightUnit})`}
        keyboardType="decimal-pad"
        value={form.targetWeight}
        onChangeText={(value) => setField('targetWeight', value)}
        style={stepLayout.field}
      />

      <BmiCard bmi={bmiFor(form.heightCm, form.currentWeight, settings.units)} />
    </View>
  );
}
