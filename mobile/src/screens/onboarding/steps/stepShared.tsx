import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import type { WizardFormValues } from '../../../domain/profileForm';
import { fonts, radius, spacing } from '../../../theme';
import { useThemedStyles } from '../../../theme/useThemedStyles';

/**
 * What every wizard step is handed, and the two pieces of chrome they share.
 *
 * One component per step (`agent-os/standards/frontend/components.md`), which is also what
 * keeps each of them readable — the web's equivalent is a single 291-line file with five
 * `{step === n && ...}` blocks inside it.
 */
export interface StepProps {
  form: WizardFormValues;
  setField: <K extends keyof WizardFormValues>(key: K, value: WizardFormValues[K]) => void;
}

/** The heading each collecting step opens with. */
export function StepHeading({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles((colors) => ({
    heading: {
      color: colors.text,
      fontFamily: fonts.displaySemibold,
      fontWeight: '600',
      marginBottom: spacing.md,
    },
  }));

  return (
    <Text variant="headlineSmall" style={styles.heading}>
      {children}
    </Text>
  );
}

/**
 * The BMI readout, shown on Body Stats and again on Complete.
 *
 * Renders nothing without a value, which is how the web behaves too: BMI is derived from
 * height and weight rather than stored, so there is simply nothing to show until both are
 * present, and a placeholder would only invite someone to read it as a measurement.
 */
export function BmiCard({ bmi }: { bmi: string | null }) {
  const styles = useThemedStyles((colors) => ({
    card: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    label: {
      color: colors.textMuted,
    },
    value: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
  }));

  if (!bmi) return null;

  return (
    <View style={styles.card}>
      <Text variant="bodySmall" style={styles.label}>Your BMI</Text>
      <Text variant="headlineSmall" style={styles.value}>{bmi}</Text>
    </View>
  );
}

export const stepLayout = StyleSheet.create({
  field: {
    marginTop: spacing.sm,
  },
  centered: {
    alignItems: 'center',
  },
});
