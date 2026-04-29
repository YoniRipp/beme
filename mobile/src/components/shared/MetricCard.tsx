import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Icon, Text } from 'react-native-paper';
import { colors, radius, spacing } from '../../theme';

interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  meta?: string;
  tone?: 'primary' | 'food' | 'workout' | 'sleep';
}

const toneColor = {
  primary: colors.primary,
  food: colors.food,
  workout: colors.workout,
  sleep: colors.sleep,
};

const toneBg = {
  primary: colors.primarySoft,
  food: colors.foodSoft,
  workout: colors.workoutSoft,
  sleep: colors.sleepSoft,
};

export function MetricCard({ icon, label, value, meta, tone = 'primary' }: MetricCardProps) {
  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: toneBg[tone] }]}>
          <Icon source={icon} size={18} color={toneColor[tone]} />
        </View>
        <Text variant="headlineSmall" style={styles.value}>{value}</Text>
        <Text variant="labelMedium" style={styles.label}>{label}</Text>
        {meta && <Text variant="bodySmall" style={styles.meta} numberOfLines={1}>{meta}</Text>}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    gap: spacing.xs,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.text,
    fontWeight: '800',
  },
  label: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  meta: {
    color: colors.textMuted,
  },
});
