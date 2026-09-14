import React from 'react';
import { ScrollView } from 'react-native';
import { Chip } from 'react-native-paper';
import { spacing } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
  labels?: Record<Period, string>;
}

const DEFAULT_LABELS: Record<Period, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const PERIODS: Period[] = ['daily', 'weekly', 'monthly', 'yearly'];

export function PeriodSelector({ value, onChange, labels = DEFAULT_LABELS }: PeriodSelectorProps) {
  const styles = useThemedStyles(() => ({
    container: { flexDirection: 'row', marginVertical: spacing.sm },
    chip: { marginRight: spacing.sm },
  }));
  /**
   * No colour props. This used to paint the selected chip by hand —
   * `backgroundColor: colors.primary` with `color: colors.primaryForeground` text — a
   * solid accent pill that exists nowhere on the web. It was not a design choice: MD3
   * `secondaryContainer`/`onSecondaryContainer` were unmapped, so Paper painted the
   * selected chip in its own `#4A4458` purple and the only way out was to override it
   * here. Those roles are mapped now (`mobile/src/theme.ts`), to the accent at 10% with
   * the accent as its foreground, which is exactly the web's
   * `border-primary bg-primary/10` (`frontend/src/components/shared/PeriodSelector.tsx`).
   *
   * The `mode` switch STAYS, and the spec's plan was wrong to bundle it in with the
   * overrides. In Paper v3 `selected` alone only adds the check icon: `mode="flat"` is
   * what reads `secondaryContainer`, and `mode="outlined"` reads `surface` + `outline`
   * (`Chip/helpers.js` `getDefaultBackgroundColor`). Dropping the switch would make the
   * selected and unselected chips the same colour — which is the same class of silent
   * bug this PR is fixing, in the opposite direction.
   *
   * Remaining divergence, stated rather than papered over: the web's selected button
   * also gets `border-primary`, and a flat Paper chip has no border at all. Matching
   * that would mean a per-call-site override again, for a hairline.
   */
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {PERIODS.map((period) => (
        <Chip
          key={period}
          selected={value === period}
          onPress={() => onChange(period)}
          style={styles.chip}
          mode={value === period ? 'flat' : 'outlined'}
        >
          {labels[period]}
        </Chip>
      ))}
    </ScrollView>
  );
}


