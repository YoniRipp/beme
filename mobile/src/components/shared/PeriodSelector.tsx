import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';

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
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {PERIODS.map((period) => (
        <Chip
          key={period}
          selected={value === period}
          onPress={() => onChange(period)}
          style={[styles.chip, value === period && styles.selectedChip]}
          textStyle={value === period ? styles.selectedText : undefined}
          mode={value === period ? 'flat' : 'outlined'}
        >
          {labels[period]}
        </Chip>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', marginVertical: 8 },
  chip: { marginRight: 8 },
  selectedChip: { backgroundColor: '#3b82f6' },
  selectedText: { color: '#fff' },
});
