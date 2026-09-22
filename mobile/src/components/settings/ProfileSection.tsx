import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, RadioButton, Text, TextInput } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { unitForSystem } from '@trackvibe/shared/domain';
import { Button } from '../ui';
import { messageFor } from '../../lib/errorMessage';
import {
  bmiFor,
  emptyProfileForm,
  profileSectionPayload,
  profileToForm,
  type ProfileFormValues,
} from '../../domain/profileForm';
import { useProfile } from '../../hooks/useProfile';
import { useSettings } from '../../hooks/useSettings';
import { fonts, radius, spacing } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { DateOfBirthInput } from './DateOfBirthInput';

/**
 * The editable fitness profile, mirroring `frontend/src/components/settings/
 * ProfileSection.tsx` field for field: sex, date of birth, height, current and target
 * weight, activity level, water goal, and the derived BMI.
 *
 * This screen is why three features that already ship on this client were quietly degraded.
 * `WaterCard` divides by `profile.waterGoalGlasses`, `CycleCard` reads
 * `profile.averageCycleLength`, and `HomeScreen:388` renders `CycleCard` only when
 * `profile.cycleTrackingEnabled` — and until now nothing on Expo could write any of the
 * three, so they were permanently 8, 28 and off. `sex` being unreachable here was the
 * second half of that: the web only shows its own cycle switch when `sex === 'female'`, so
 * a phone-only user could not turn cycle tracking on from either client.
 *
 * The option VALUES below are contract, not copy. They are written to `user_profiles` and
 * read back by the AI prompt builders (`backend/src/services/insights.ts:159-176`,
 * `chat.ts:125-136`), so an invented value would be a data bug rather than a wording
 * difference. Taken verbatim from `ProfileSection.tsx:72-77` and `:111-115`.
 */

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Lightly Active' },
  { value: 'moderate', label: 'Moderately Active' },
  { value: 'active', label: 'Active' },
  { value: 'very_active', label: 'Very Active' },
] as const;

export function ProfileSection() {
  const styles = useThemedStyles((colors) => ({
    groupLabel: {
      color: colors.textMuted,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    bmiRow: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
    },
    bmiLabel: {
      color: colors.textMuted,
    },
    bmiValue: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
    error: {
      color: colors.danger,
      paddingVertical: spacing.sm,
    },
  }));

  const { profile, profileLoading, profileError, updateProfile, isUpdating } = useProfile();
  const { settings } = useSettings();
  const [form, setForm] = useState<ProfileFormValues>(emptyProfileForm);

  /**
   * Re-seed whenever the server's profile or the unit system changes — the same
   * `useEffect([profile])` the web form uses (`ProfileSection.tsx:26-41`), plus `units`,
   * because the weight fields are displayed in the user's system and a switch has to
   * re-render the number rather than relabel it.
   *
   * Paired with the loading gate below, which is what makes it safe. Seeding in an effect
   * means the arrival of the profile overwrites the form — so if the form were on screen
   * before the request came back, it would silently wipe whatever the user had already
   * typed into it.
   */
  useEffect(() => {
    setForm(profileToForm(profile, settings.units));
  }, [profile, settings.units]);

  const weightUnit = unitForSystem(settings.units);
  const bmi = bmiFor(form.heightCm, form.currentWeight, settings.units);

  const setField = <K extends keyof ProfileFormValues>(
    key: K,
    value: ProfileFormValues[K]
  ) => setForm((previous) => ({ ...previous, [key]: value }));

  const handleSave = async () => {
    try {
      await updateProfile(profileSectionPayload(form, settings.units));
      Toast.show({ type: 'success', text1: 'Profile updated' });
    } catch (error) {
      Toast.show({ type: 'error', text1: messageFor(error, 'Could not update profile') });
    }
  };

  if (profileLoading) {
    return <ActivityIndicator accessibilityLabel="Loading your profile" style={layout.loading} />;
  }

  /**
   * A failed load gets said out loud rather than rendered as an empty form. PR #353 fixed
   * exactly this across every list screen on this client — the errors had been computed for
   * months and no screen read them — and a blank profile form is the same lie in a
   * different shape: indistinguishable from a profile nobody has filled in yet.
   *
   * Save goes with it. There is nothing useful to save on top of a profile we could not read.
   */
  if (profileError) {
    return (
      <Text variant="bodyMedium" style={styles.error}>
        Could not load your profile. Pull down to try again.
      </Text>
    );
  }

  return (
    <View>
      <Text variant="labelLarge" style={styles.groupLabel}>Sex</Text>
      <RadioButton.Group
        onValueChange={(value) => setField('sex', value)}
        value={form.sex}
      >
        {SEX_OPTIONS.map((option) => (
          <RadioButton.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </RadioButton.Group>

      <Text variant="labelLarge" style={styles.groupLabel}>Date of birth</Text>
      <DateOfBirthInput
        value={form.dateOfBirth}
        onChange={(value) => setField('dateOfBirth', value)}
        dateFormat={settings.dateFormat}
        maxYear={new Date().getFullYear()}
      />

      <TextInput
        mode="outlined"
        label="Height (cm)"
        accessibilityLabel="Height (cm)"
        keyboardType="numeric"
        value={form.heightCm}
        onChangeText={(value) => setField('heightCm', value)}
        style={layout.input}
      />
      <TextInput
        mode="outlined"
        label={`Current weight (${weightUnit})`}
        accessibilityLabel={`Current weight (${weightUnit})`}
        keyboardType="decimal-pad"
        value={form.currentWeight}
        onChangeText={(value) => setField('currentWeight', value)}
        style={layout.input}
      />
      <TextInput
        mode="outlined"
        label={`Target weight (${weightUnit})`}
        accessibilityLabel={`Target weight (${weightUnit})`}
        keyboardType="decimal-pad"
        value={form.targetWeight}
        onChangeText={(value) => setField('targetWeight', value)}
        style={layout.input}
      />

      <Text variant="labelLarge" style={styles.groupLabel}>Activity level</Text>
      <RadioButton.Group
        onValueChange={(value) => setField('activityLevel', value)}
        value={form.activityLevel}
      >
        {ACTIVITY_OPTIONS.map((option) => (
          <RadioButton.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </RadioButton.Group>

      <TextInput
        mode="outlined"
        label="Water goal (glasses)"
        accessibilityLabel="Water goal (glasses)"
        keyboardType="number-pad"
        value={form.waterGoalGlasses}
        onChangeText={(value) => setField('waterGoalGlasses', value)}
        style={layout.input}
      />

      {bmi && (
        <View style={styles.bmiRow}>
          <Text variant="bodySmall" style={styles.bmiLabel}>BMI</Text>
          <Text variant="titleMedium" style={styles.bmiValue}>{bmi}</Text>
        </View>
      )}

      {/* One explicit Save, like the web — the profile form is not per-field autosave. */}
      <Button
        mode="contained"
        onPress={handleSave}
        disabled={isUpdating}
        loading={isUpdating}
        style={layout.save}
      >
        {isUpdating ? 'Saving...' : 'Save Profile'}
      </Button>
    </View>
  );
}

// No colour dependency, so these stay on `StyleSheet.create` — the frozen-palette bug that
// forced the move to `useThemedStyles` only affects styles that read `colors`.
const layout = StyleSheet.create({
  loading: {
    paddingVertical: spacing.lg,
  },
  input: {
    marginTop: spacing.sm,
  },
  save: {
    marginTop: spacing.md,
  },
});
