import React from 'react';
import { Pressable, View } from 'react-native';
import { Chip, Icon, Text } from 'react-native-paper';
import { Card, IconButton } from '../ui';
import { formatDate, getWeightUnit } from '@trackvibe/shared/domain';
import { Workout } from '../../types/workout';
import { radius, spacing } from '../../theme';
import { useSettings } from '../../hooks/useSettings';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

/** Minimum touch target, per agent-os/standards/frontend/mobile-ui.md. */
const TAP_TARGET = 44;

interface MobileWorkoutCardProps {
  workout: Workout;
  expanded?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Ticks the workout off. Omit to render the card without a completion control. */
  onToggleCompleted?: (id: string, completed: boolean) => void;
}

export function MobileWorkoutCard({
  workout,
  expanded,
  onPress,
  onEdit,
  onDelete,
  onToggleCompleted,
}: MobileWorkoutCardProps) {
  const { colors } = useThemeContext();
  // The card used to hardcode `EEE, MMM d` and `kg`, so an imperial user was shown
  // kilograms and nobody's date-format choice reached this screen. Both now resolve from
  // the same settings blob the web reads, through the same shared helpers.
  const { settings } = useSettings();
  const weightUnit = getWeightUnit(settings.units);
  const styles = useThemedStyles((colors) => ({
    card: {
    },
    completedCard: {
      opacity: 0.75,
    },
    content: {
      gap: spacing.md,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    toggle: {
      width: TAP_TARGET,
      height: TAP_TARGET,
      marginLeft: -spacing.sm,
      marginRight: -spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
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
    titleCompleted: {
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    meta: {
      color: colors.textMuted,
      marginTop: spacing.xxs,
    },
    // Both this badge and `exerciseRow` below are filled grounds sitting directly on the
    // card's `colors.surface`, which is 1.03:1 away from `surfaceMuted` in the default
    // dark theme — the badge loses its pill entirely and the exercise rows lose their
    // banding, leaving bare text. `muted` is the role, and it is what the web paints both
    // with: `bg-muted` on the badge and `bg-muted/70` on the row
    // (`frontend/src/components/body/WorkoutCard.tsx`).
    chip: {
      backgroundColor: colors.muted,
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
      backgroundColor: colors.muted,
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
    actionButton: {
      width: TAP_TARGET,
      height: TAP_TARGET,
      margin: 0,
    },
  }));

  return (
    <Card
      mode="contained"
      style={[styles.card, workout.completed && styles.completedCard]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Workout: ${workout.title}, ${workout.type}, ${workout.durationMinutes || 0} minutes`}
    >
      <Card.Content style={styles.content}>
        <View style={styles.topRow}>
          {onToggleCompleted && (
            <Pressable
              style={styles.toggle}
              onPress={() => onToggleCompleted(workout.id, !workout.completed)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!workout.completed }}
              accessibilityLabel={workout.completed ? 'Mark as not completed' : 'Mark as completed'}
            >
              <Icon
                source={workout.completed ? 'check-circle' : 'checkbox-blank-circle-outline'}
                size={24}
                color={workout.completed ? colors.success : colors.textMuted}
              />
            </Pressable>
          )}
          <View style={styles.iconWrap}>
            <Icon source="dumbbell" size={22} color={colors.workout} />
          </View>
          <View style={styles.titleBlock}>
            <Text
              variant="titleMedium"
              style={[styles.title, workout.completed && styles.titleCompleted]}
              numberOfLines={1}
            >
              {workout.title}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              {formatDate(workout.date, settings.dateFormat)} · {workout.durationMinutes || 0} min
            </Text>
          </View>
          <Chip compact style={styles.chip} textStyle={styles.chipText}>{workout.type}</Chip>
        </View>

        <View style={styles.exerciseList}>
          {workout.exercises.slice(0, expanded ? workout.exercises.length : 3).map((exercise, index) => (
            <View key={`${exercise.name}-${index}`} style={styles.exerciseRow}>
              <Text variant="bodyMedium" style={styles.exerciseName} numberOfLines={1}>{exercise.name}</Text>
              <Text variant="bodySmall" style={styles.exerciseMeta}>
                {exercise.sets} sets × {exercise.reps} reps{exercise.weight ? ` · ${exercise.weight}${weightUnit}` : ''}
              </Text>
            </View>
          ))}
          {!expanded && workout.exercises.length > 3 && (
            <Text variant="bodySmall" style={styles.more}>+{workout.exercises.length - 3} more</Text>
          )}
        </View>

        {(onEdit || onDelete) && (
          <View style={styles.actions}>
            {onEdit && (
              <IconButton
                icon="pencil"
                size={18}
                style={styles.actionButton}
                onPress={onEdit}
                accessibilityLabel={`Edit workout: ${workout.title}`}
              />
            )}
            {onDelete && (
              <IconButton
                icon="trash-can-outline"
                size={18}
                iconColor={colors.danger}
                style={styles.actionButton}
                onPress={onDelete}
                accessibilityLabel={`Delete workout: ${workout.title}`}
              />
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}
