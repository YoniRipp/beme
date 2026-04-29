import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, Icon, IconButton, Text } from 'react-native-paper';
import { format } from 'date-fns';
import { Workout } from '../../types/workout';
import { colors, radius, spacing } from '../../theme';

interface MobileWorkoutCardProps {
  workout: Workout;
  expanded?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function MobileWorkoutCard({ workout, expanded, onPress, onEdit, onDelete }: MobileWorkoutCardProps) {
  return (
    <Card mode="contained" style={styles.card} onPress={onPress}>
      <Card.Content style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Icon source="dumbbell" size={22} color={colors.workout} />
          </View>
          <View style={styles.titleBlock}>
            <Text variant="titleMedium" style={styles.title} numberOfLines={1}>{workout.title}</Text>
            <Text variant="bodySmall" style={styles.meta}>
              {format(workout.date, 'EEE, MMM d')} · {workout.durationMinutes || 0} min
            </Text>
          </View>
          <Chip compact style={styles.chip} textStyle={styles.chipText}>{workout.type}</Chip>
        </View>

        <View style={styles.exerciseList}>
          {workout.exercises.slice(0, expanded ? workout.exercises.length : 3).map((exercise, index) => (
            <View key={`${exercise.name}-${index}`} style={styles.exerciseRow}>
              <Text variant="bodyMedium" style={styles.exerciseName} numberOfLines={1}>{exercise.name}</Text>
              <Text variant="bodySmall" style={styles.exerciseMeta}>
                {exercise.sets} sets × {exercise.reps} reps{exercise.weight ? ` · ${exercise.weight}kg` : ''}
              </Text>
            </View>
          ))}
          {!expanded && workout.exercises.length > 3 && (
            <Text variant="bodySmall" style={styles.more}>+{workout.exercises.length - 3} more</Text>
          )}
        </View>

        {(onEdit || onDelete) && (
          <View style={styles.actions}>
            {onEdit && <IconButton icon="pencil" size={18} onPress={onEdit} />}
            {onDelete && <IconButton icon="trash-can-outline" size={18} iconColor={colors.danger} onPress={onDelete} />}
          </View>
        )}
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
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.workoutSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
  },
  meta: {
    color: colors.textMuted,
    marginTop: 2,
  },
  chip: {
    backgroundColor: colors.surfaceMuted,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  exerciseList: {
    gap: spacing.sm,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exerciseName: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
  },
  exerciseMeta: {
    color: colors.textMuted,
  },
  more: {
    color: colors.textMuted,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
