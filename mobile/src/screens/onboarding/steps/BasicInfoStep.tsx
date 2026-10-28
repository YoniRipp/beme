import React from 'react';
import { View } from 'react-native';
import { RadioButton, Text } from 'react-native-paper';
import { SEX_OPTIONS } from '../../../domain/profileForm';
import { useSettings } from '../../../hooks/useSettings';
import { spacing } from '../../../theme';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { DateOfBirthInput } from '../../../components/settings/DateOfBirthInput';
import { StepHeading, type StepProps } from './stepShared';

/**
 * Step 2 of 5 — sex and date of birth (`SetupWizard.tsx:99-130`).
 *
 * `sex` carries more weight than its two words suggest: it is what both clients gate cycle
 * tracking on, so a user who skips past it here cannot reach that feature from either the
 * phone or the browser afterwards. It is still optional, as on the web — "Prefer not to
 * say" is one of the four values the column accepts.
 */
export function BasicInfoStep({ form, setField }: StepProps) {
  const styles = useThemedStyles((colors) => ({
    label: {
      color: colors.textMuted,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
  }));
  const { settings } = useSettings();

  return (
    <View>
      <StepHeading>Basic Info</StepHeading>

      <Text variant="labelLarge" style={styles.label}>Sex</Text>
      <RadioButton.Group
        onValueChange={(value) => setField('sex', value)}
        value={form.sex}
      >
        {SEX_OPTIONS.map((option) => (
          <RadioButton.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </RadioButton.Group>

      <Text variant="labelLarge" style={styles.label}>Date of birth</Text>
      <DateOfBirthInput
        value={form.dateOfBirth}
        onChange={(value) => setField('dateOfBirth', value)}
        dateFormat={settings.dateFormat}
        maxYear={new Date().getFullYear()}
      />
    </View>
  );
}
