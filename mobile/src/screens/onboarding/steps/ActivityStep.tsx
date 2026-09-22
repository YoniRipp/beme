import React from 'react';
import { Pressable, View } from 'react-native';
import { Switch, Text, TextInput } from 'react-native-paper';
import { ACTIVITY_OPTIONS } from '../../../domain/profileForm';
import { MIN_TOUCH_TARGET } from '../../../components/ui';
import { fonts, radius, spacing } from '../../../theme';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { StepHeading, stepLayout, type StepProps } from './stepShared';

/**
 * Step 4 of 5 — the five activity levels, and cycle tracking for a user who said female
 * (`SetupWizard.tsx:185-246`).
 *
 * The cycle block is behind the same `sex === 'female'` condition the web uses, here and in
 * the Settings section. Worth knowing why it appears in a first-run wizard at all: before
 * the Settings section existed this was the ONLY place a phone-only user could ever have
 * enabled cycle tracking, because the web hides its own switch behind the same condition
 * and `sex` was unreachable from the phone.
 */
export function ActivityStep({ form, setField }: StepProps) {
  const styles = useThemedStyles((colors) => ({
    option: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.sm,
      minHeight: MIN_TOUCH_TARGET,
      justifyContent: 'center',
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    optionLabel: {
      color: colors.text,
      fontFamily: fonts.medium,
    },
    optionDescription: {
      color: colors.textMuted,
    },
    cycleBlock: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.lg,
      paddingTop: spacing.md,
    },
    cycleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cycleLabel: {
      color: colors.text,
    },
    cycleHint: {
      color: colors.textMuted,
    },
    cycleText: {
      flex: 1,
      paddingRight: spacing.md,
    },
  }));

  return (
    <View>
      <StepHeading>Activity Level</StepHeading>

      {ACTIVITY_OPTIONS.map((option) => {
        const selected = form.activityLevel === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setField('activityLevel', option.value)}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <Text variant="bodyMedium" style={styles.optionLabel}>{option.label}</Text>
            <Text variant="bodySmall" style={styles.optionDescription}>
              {option.description}
            </Text>
          </Pressable>
        );
      })}

      {form.sex === 'female' && (
        <View style={styles.cycleBlock}>
          <View style={styles.cycleRow}>
            <View style={styles.cycleText}>
              <Text variant="bodyMedium" style={styles.cycleLabel}>Cycle Tracking</Text>
              <Text variant="bodySmall" style={styles.cycleHint}>
                Track your menstrual cycle
              </Text>
            </View>
            <Switch
              accessibilityLabel="Enable cycle tracking"
              value={form.cycleTrackingEnabled}
              onValueChange={(value) => setField('cycleTrackingEnabled', value)}
            />
          </View>

          {form.cycleTrackingEnabled && (
            <TextInput
              mode="outlined"
              label="Average cycle length (days)"
              accessibilityLabel="Average cycle length (days)"
              keyboardType="number-pad"
              value={form.averageCycleLength}
              onChangeText={(value) => setField('averageCycleLength', value)}
              style={stepLayout.field}
            />
          )}
        </View>
      )}
    </View>
  );
}
