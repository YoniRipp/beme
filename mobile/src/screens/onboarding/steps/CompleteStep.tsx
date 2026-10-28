import React from 'react';
import { View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { unitForSystem } from '@trackvibe/shared/domain';
import { activityLabel, bmiFor } from '../../../domain/profileForm';
import { useSettings } from '../../../hooks/useSettings';
import { fonts, radius, spacing } from '../../../theme';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { BmiCard, type StepProps } from './stepShared';

/** The circular step badge, matching the web's `w-16 h-16` (`SetupWizard.tsx:88`). */
const BADGE_SIZE = 64;

/**
 * Step 5 of 5 — the confirmation, the BMI and a summary of what is about to be written
 * (`SetupWizard.tsx:248-271`).
 *
 * The summary lists only the fields the user actually filled in, which is the honest thing
 * to show given that everything they skipped is about to be omitted from the write rather
 * than sent as a blank. It is also the last chance to notice a typo before it becomes the
 * profile the AI coach reasons about.
 */
export function CompleteStep({ form }: StepProps) {
  const styles = useThemedStyles((colors) => ({
    container: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    badge: {
      width: BADGE_SIZE,
      height: BADGE_SIZE,
      // Geometry, not a design token: a circle's radius is half its box. `radius.*` carries
      // the shared corner scale (sm..xxl) and has no "full" step to reach for.
      borderRadius: BADGE_SIZE / 2,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    icon: {
      color: colors.success,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.displaySemibold,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    body: {
      color: colors.textMuted,
      textAlign: 'center',
    },
    summary: {
      alignSelf: 'stretch',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    summaryLabel: {
      color: colors.textMuted,
    },
    summaryValue: {
      color: colors.text,
      fontFamily: fonts.medium,
    },
  }));

  const { settings } = useSettings();
  const weightUnit = unitForSystem(settings.units);

  const rows: { label: string; value: string }[] = [];
  if (form.heightCm) rows.push({ label: 'Height', value: `${form.heightCm} cm` });
  if (form.currentWeight) {
    rows.push({ label: 'Weight', value: `${form.currentWeight} ${weightUnit}` });
  }
  if (form.targetWeight) {
    rows.push({ label: 'Target', value: `${form.targetWeight} ${weightUnit}` });
  }
  if (form.activityLevel) {
    rows.push({ label: 'Activity', value: activityLabel(form.activityLevel) });
  }

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Icon source="check" size={32} color={styles.icon.color} />
      </View>
      <Text variant="headlineSmall" style={styles.title}>All Set!</Text>
      <Text variant="bodyMedium" style={styles.body}>
        Your profile is ready. You can always update these settings later.
      </Text>

      <BmiCard bmi={bmiFor(form.heightCm, form.currentWeight, settings.units)} />

      {rows.length > 0 && (
        <View style={styles.summary}>
          {rows.map((row) => (
            <View key={row.label} style={styles.summaryRow}>
              <Text variant="bodySmall" style={styles.summaryLabel}>{row.label}</Text>
              <Text variant="bodySmall" style={styles.summaryValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
