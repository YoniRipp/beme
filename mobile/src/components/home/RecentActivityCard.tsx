import React from 'react';
import { View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';
import { isSameDay, format } from 'date-fns';
import type { RecentActivityItem } from '@trackvibe/shared/domain';
import { fonts, radius, spacing } from '../../theme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { SectionCard } from '../shared/SectionCard';

interface RecentActivityCardProps {
  items: readonly RecentActivityItem[];
  /** Food rows open the Energy tab, workout rows the Body tab — the web's /energy and /body. */
  onOpen: (type: RecentActivityItem['type']) => void;
}

/** "Today" for today's rows, "Mon, Sep 8" otherwise — the web's own formatting. */
export function activityDateLabel(date: Date, now: Date = new Date()): string {
  if (Number.isNaN(date.getTime())) return '';
  return isSameDay(date, now) ? 'Today' : format(date, 'EEE, MMM d');
}

/**
 * The five newest food entries and workouts, each row a way into the screen that owns it.
 *
 * The merge itself is `buildRecentActivity` in `@trackvibe/shared/domain`, shared with the
 * web's Home. Needs no endpoint of its own — both hooks already hold these rows.
 */
export function RecentActivityCard({ items, onOpen }: RecentActivityCardProps) {
  const { colors } = useThemeContext();
  const styles = useThemedStyles((colors) => ({
    rows: {
      gap: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      // A 44px minimum target, without a fixed height that would clip a wrapped name.
      minHeight: 44,
    },
    glyph: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      flex: 1,
    },
    name: {
      color: colors.text,
      fontFamily: fonts.semibold,
      fontWeight: '600',
    },
    detail: {
      color: colors.textMuted,
    },
    when: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    whenText: {
      color: colors.textMuted,
    },
  }));

  if (items.length === 0) return null;

  return (
    <SectionCard title="Recent activity">
      <View style={styles.rows}>
        {items.map((item) => {
          const isFood = item.type === 'food';
          return (
            <TouchableRipple
              key={`${item.type}-${item.id}`}
              onPress={() => onOpen(item.type)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.detail}. Open ${isFood ? 'food log' : 'workouts'}`}
              style={styles.row}
            >
              <>
                <View
                  style={[styles.glyph, { backgroundColor: isFood ? colors.foodSoft : colors.workoutSoft }]}
                >
                  <Icon
                    source={isFood ? 'silverware-fork-knife' : 'dumbbell'}
                    size={16}
                    color={isFood ? colors.food : colors.workout}
                  />
                </View>
                <View style={styles.body}>
                  <Text variant="bodyMedium" style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.detail}>
                    {item.detail}
                  </Text>
                </View>
                <View style={styles.when}>
                  <Text variant="bodySmall" style={styles.whenText}>
                    {activityDateLabel(item.date)}
                  </Text>
                  <Icon source="chevron-right" size={12} color={colors.textMuted} />
                </View>
              </>
            </TouchableRipple>
          );
        })}
      </View>
    </SectionCard>
  );
}
