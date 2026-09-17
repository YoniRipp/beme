import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { addDays, format, isSameDay } from 'date-fns';
import { Button } from '../ui';
import { spacing } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

/**
 * Pick a day without adding a native module.
 *
 * Every form on this client hardcoded today — `WorkoutFormScreen` held its date in a `useState`
 * with no setter and rendered the field `editable={false}`, and the others built
 * `new Date()` at save time. So nothing could be backdated from the phone: a workout you forgot
 * to log last night, a weigh-in from the morning, yesterday's dinner. The web has had a plain
 * `<input type="date">` for all of them.
 *
 * **Relative days rather than a calendar, deliberately.** A real date picker means
 * `@react-native-community/datetimepicker`, which is a native module — and `mobile/CLAUDE.md` is
 * explicit that every new native module makes everyone rebuild their dev client, and must be
 * flagged rather than added. Backdating is overwhelmingly "yesterday" or "the day before", so a
 * short relative row covers the real need at zero dependency cost. If someone needs an arbitrary
 * date later, that is the moment to have the dependency conversation, with a concrete case.
 *
 * The bound is the other half of the design: **you cannot pick a future day.** Every one of
 * these forms records something that happened, and a workout logged for next Tuesday is a data
 * bug that then has to be found and deleted.
 */

/** How far back the row reaches. Seven covers "last week some time" without becoming a grid. */
export const DAY_PICKER_RANGE = 7;

/** Label for an offset: 0 → Today, 1 → Yesterday, then the weekday, then the date. */
export function dayLabel(offset: number, today: Date): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Yesterday';
  const day = addDays(today, -offset);
  // Inside a week the weekday is what someone actually remembers ("I trained Tuesday"); beyond
  // it the weekday is ambiguous, so fall back to a date.
  return offset < 7 ? format(day, 'EEEE') : format(day, 'MMM d');
}

export function DayPicker({
  value,
  onChange,
  today,
  label = 'Date',
}: {
  value: Date;
  onChange: (date: Date) => void;
  /** Injected so a test can pin "now" — never defaulted inside the render. */
  today: Date;
  label?: string;
}) {
  const styles = useThemedStyles((colors) => ({
    label: { color: colors.textMuted, marginBottom: spacing.xs },
  }));

  const offsets = Array.from({ length: DAY_PICKER_RANGE }, (_, i) => i);

  return (
    <View style={layout.container}>
      <Text variant="labelLarge" style={styles.label}>
        {label}
      </Text>
      <View style={layout.row}>
        {offsets.map((offset) => {
          const day = addDays(today, -offset);
          const selected = isSameDay(day, value);
          return (
            <Button
              key={offset}
              mode={selected ? 'contained' : 'outlined'}
              compact
              // The accessible name carries the actual date, because "Yesterday" read aloud on
              // its own is ambiguous once you are three screens into a form.
              accessibilityLabel={`${dayLabel(offset, today)}, ${format(day, 'EEEE d MMMM')}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(day)}
              style={layout.chip}
            >
              {dayLabel(offset, today)}
            </Button>
          );
        })}
      </View>
    </View>
  );
}

// Spacing only — the colours come from the themed styles above and from Paper's own modes.
const layout = StyleSheet.create({
  container: { marginBottom: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { marginBottom: spacing.xs },
});
