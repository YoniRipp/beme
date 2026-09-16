import React from 'react';
import { View } from 'react-native';
import { Icon, ProgressBar, Text } from 'react-native-paper';
import { Card, IconButton } from '../ui';
import { formatGoalValue, GOAL_UNIT_LABELS } from '@trackvibe/shared/domain';
import { Goal } from '../../types/goals';
import { radius, spacing } from '../../theme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

/** Minimum touch target, per agent-os/standards/frontend/mobile-ui.md. */
const TOUCH_TARGET = 44;

interface MobileGoalCardProps {
  goal: Goal;
  current?: number;
  /**
   * Progress as 0-100, from `computeGoalProgress` via GoalsScreen's `goalsWithCurrent`.
   * The card used to derive `current / goal.target` itself — a second copy of the shared
   * calculator's arithmetic, without its divide-by-zero guard or its >100% clamp. Optional
   * only so the prop can be omitted in isolation; when it is, it falls back to the same
   * guarded formula rather than to a silent 0.
   */
  percentage?: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function MobileGoalCard({ goal, current = 0, percentage, onEdit, onDelete }: MobileGoalCardProps) {
  const { colors } = useThemeContext();

  // Icon and colour only. The unit noun used to live here too, and had drifted from the
  // web's ("kcal" against the web Goals card's "calories") — it now comes from
  // GOAL_UNIT_LABELS in @trackvibe/shared/domain, alongside the value formatter.
  const typeMeta: Record<string, { icon: string; color: string; bg: string }> = {
    calories: { icon: 'fire', color: colors.food, bg: colors.foodSoft },
    workouts: { icon: 'dumbbell', color: colors.workout, bg: colors.workoutSoft },
    sleep: { icon: 'moon-waning-crescent', color: colors.sleep, bg: colors.sleepSoft },
  };
  const meta = typeMeta[goal.type] ?? typeMeta.workouts;
  const pct =
    percentage ?? (goal.target > 0 ? Math.min((current / goal.target) * 100, 100) : 0);
  const achieved = pct >= 100;
  const pctLabel = `${pct.toFixed(0)}% complete`;

  const styles = useThemedStyles((colors) => ({
    card: {
    },
    // The web tints the whole card's border with success once a goal is met
    // (`achieved && 'border-success/40'`); this is that, in Paper's vocabulary.
    cardAchieved: {
      borderColor: colors.success,
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
    percent: {
      color: colors.textMuted,
      marginTop: 2,
    },
    // The unfilled remainder of the bar. `surfaceMuted` — what this was — maps to the web's
    // `--paper-2`, NOT to the `--muted` the web draws its tracks with, and against this
    // card's own `surface` it comes to 1.03:1 in dark, the default theme: the remainder
    // vanishes and a 20% bar reads as full. `muted` is that role (1.19:1 dark / 1.17:1
    // light) and is what the web's own bars use — `home/WaterTracker.tsx`'s
    // `h-1.5 bg-muted rounded-full`, not the unrendered `ui/progress.tsx` primitive the
    // spec cites (that one is `bg-secondary`). See ProgressRing.tsx for the full table.
    progress: {
      height: 6,
      borderRadius: radius.sm,
      marginTop: spacing.sm,
      backgroundColor: colors.muted,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    // Paper sizes an IconButton's container at `size + 16`, so the 18pt icons were sitting
    // in a 34pt hit area — under the 44pt minimum in frontend/mobile-ui, and these are the
    // only two controls on the card. Fixing the container rather than the glyph keeps the
    // icons the size they already were.
    action: {
      width: TOUCH_TARGET,
      height: TOUCH_TARGET,
      margin: 0,
    },
  }));

  return (
    <Card mode="contained" style={[styles.card, achieved && styles.cardAchieved]}>
      <Card.Content style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          <Icon source={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={styles.body}>
          <Text variant="labelMedium" style={styles.period}>{goal.period}</Text>
          <Text variant="titleMedium" style={styles.title}>{goal.type} goal</Text>
          <Text variant="bodySmall" style={styles.meta}>
            {formatGoalValue(goal.type, current)} / {formatGoalValue(goal.type, goal.target)}{' '}
            {GOAL_UNIT_LABELS[goal.type]}
          </Text>
          <Text variant="bodySmall" style={styles.percent}>{pctLabel}</Text>
          {/* The bar had no accessible name, so a screen reader landing on it announced a
              bare percentage with nothing to say which goal it belonged to. This label is
              the web's sr-only sentence, verbatim. Paper's ProgressBar supplies the
              accessibilityRole and the min/max/now value itself — and applies both AFTER
              spreading the caller's props, so passing either from here would do nothing. */}
          <ProgressBar
            progress={pct / 100}
            color={meta.color}
            style={styles.progress}
            accessible
            accessibilityLabel={`${goal.type} goal progress ${pct.toFixed(0)} percent`}
          />
        </View>
        <View style={styles.actions}>
          {onEdit && (
            <IconButton
              icon="pencil"
              size={18}
              onPress={onEdit}
              style={styles.action}
              accessibilityLabel="Edit goal"
            />
          )}
          {onDelete && (
            <IconButton
              icon="trash-can-outline"
              size={18}
              iconColor={colors.danger}
              onPress={onDelete}
              style={styles.action}
              accessibilityLabel="Delete goal"
            />
          )}
        </View>
      </Card.Content>
    </Card>
  );
}
