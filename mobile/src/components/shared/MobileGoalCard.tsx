import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Icon, IconButton, ProgressBar, Text } from 'react-native-paper';
import { Goal } from '../../types/goals';
import { colors, radius, spacing } from '../../theme';

interface MobileGoalCardProps {
  goal: Goal;
  current?: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

const typeMeta: Record<string, { icon: string; color: string; bg: string; unit: string }> = {
  calories: { icon: 'fire', color: colors.food, bg: colors.foodSoft, unit: 'kcal' },
  workouts: { icon: 'dumbbell', color: colors.workout, bg: colors.workoutSoft, unit: 'workouts' },
  sleep: { icon: 'moon-waning-crescent', color: colors.sleep, bg: colors.sleepSoft, unit: 'hours' },
};

export function MobileGoalCard({ goal, current = 0, onEdit, onDelete }: MobileGoalCardProps) {
  const meta = typeMeta[goal.type] ?? typeMeta.workouts;
  const pct = goal.target > 0 ? Math.min(current / goal.target, 1) : 0;

  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          <Icon source={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={styles.body}>
          <Text variant="labelMedium" style={styles.period}>{goal.period}</Text>
          <Text variant="titleMedium" style={styles.title}>{goal.type} goal</Text>
          <Text variant="bodySmall" style={styles.meta}>
            {current.toLocaleString()} / {goal.target.toLocaleString()} {meta.unit}
          </Text>
          <ProgressBar progress={pct} color={meta.color} style={styles.progress} />
        </View>
        <View style={styles.actions}>
          {onEdit && <IconButton icon="pencil" size={18} onPress={onEdit} />}
          {onDelete && <IconButton icon="trash-can-outline" size={18} iconColor={colors.danger} onPress={onDelete} />}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  period: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  meta: {
    color: colors.textMuted,
    marginTop: 2,
  },
  progress: {
    height: 6,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  actions: {
    flexDirection: 'row',
  },
});
