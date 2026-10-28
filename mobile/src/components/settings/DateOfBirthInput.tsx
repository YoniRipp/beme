import React, { Fragment, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import type { DateFormat } from '@trackvibe/shared/settings';
import {
  DOB_PART_LABELS,
  DOB_PART_MAX_LENGTH,
  dobPartOrder,
  dobSeparator,
  joinDob,
  splitDob,
  type DobPart,
} from '../../domain/dateOfBirth';
import { spacing } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

/**
 * Date of birth as three numeric fields, mirroring `frontend/src/components/settings/
 * DateOfBirthInput.tsx` — same decomposition, same format-driven order, same
 * emit-only-when-valid contract.
 *
 * The rules live in `src/domain/dateOfBirth.ts` so they can be tested without a renderer;
 * this file is the wiring. See that module for why there is no native date picker here.
 */

interface Props {
  /** `YYYY-MM-DD`, or empty. */
  value: string;
  /** Called with a complete day string, or with `''` when the fields are cleared. */
  onChange: (next: string) => void;
  dateFormat: DateFormat;
  /** Newest acceptable year. Omitted means no ceiling. */
  maxYear?: number;
}

export function DateOfBirthInput({ value, onChange, dateFormat, maxYear }: Props) {
  const styles = useThemedStyles((colors) => ({
    separator: {
      color: colors.textMuted,
      marginHorizontal: spacing.xs,
    },
  }));

  const [parts, setParts] = useState(() => splitDob(value));

  // Re-seed when the parent's value changes — a profile arriving from the server, or a form
  // reset. Keyed on the string rather than the object so a re-render with the same date does
  // not stamp over what the user is mid-way through typing.
  useEffect(() => {
    setParts(splitDob(value));
  }, [value]);

  const handlePart = (part: DobPart, raw: string) => {
    // Digits only, and never longer than the field. RN's `number-pad` still admits a paste,
    // and on Android some keyboards offer a minus sign.
    const digits = raw.replace(/\D/g, '').slice(0, DOB_PART_MAX_LENGTH[part]);
    const next = {
      ...parts,
      ...(part === 'YYYY' ? { yyyy: digits } : part === 'MM' ? { mm: digits } : { dd: digits }),
    };
    setParts(next);

    const joined = joinDob(next.yyyy, next.mm, next.dd, maxYear);
    if (joined) {
      onChange(joined);
    } else if (!next.yyyy && !next.mm && !next.dd) {
      // Only an all-empty control clears the stored value. A half-typed one reports nothing,
      // so backspacing through a year does not wipe a date the user meant to keep until they
      // have actually cleared the whole thing — the web's rule (`DateOfBirthInput.tsx:57`).
      onChange('');
    }
  };

  const fields: Record<DobPart, React.ReactElement> = {
    DD: (
      <TextInput
        mode="outlined"
        dense
        placeholder="DD"
        accessibilityLabel={DOB_PART_LABELS.DD}
        keyboardType="number-pad"
        maxLength={DOB_PART_MAX_LENGTH.DD}
        value={parts.dd}
        onChangeText={(text) => handlePart('DD', text)}
        style={layout.dayMonth}
      />
    ),
    MM: (
      <TextInput
        mode="outlined"
        dense
        placeholder="MM"
        accessibilityLabel={DOB_PART_LABELS.MM}
        keyboardType="number-pad"
        maxLength={DOB_PART_MAX_LENGTH.MM}
        value={parts.mm}
        onChangeText={(text) => handlePart('MM', text)}
        style={layout.dayMonth}
      />
    ),
    YYYY: (
      <TextInput
        mode="outlined"
        dense
        placeholder="YYYY"
        accessibilityLabel={DOB_PART_LABELS.YYYY}
        keyboardType="number-pad"
        maxLength={DOB_PART_MAX_LENGTH.YYYY}
        value={parts.yyyy}
        onChangeText={(text) => handlePart('YYYY', text)}
        style={layout.year}
      />
    ),
  };

  const order = dobPartOrder(dateFormat);
  const separator = dobSeparator(dateFormat);

  return (
    <View style={layout.row}>
      {order.map((part, index) => (
        <Fragment key={part}>
          {index > 0 && (
            <Text variant="bodyMedium" style={styles.separator}>
              {separator}
            </Text>
          )}
          {fields[part]}
        </Fragment>
      ))}
    </View>
  );
}

// No colour dependency, so these stay on `StyleSheet.create` — only styles that read
// `colors` have to move onto `useThemedStyles` (see `SettingsScreen.tsx`'s note on the
// frozen-palette bug).
const layout = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayMonth: {
    flex: 2,
  },
  year: {
    flex: 3,
  },
});
