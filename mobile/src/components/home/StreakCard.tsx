import React from 'react';
import { View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { spacing } from '../../theme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { SectionCard } from '../shared/SectionCard';
import { useStreaks } from '../../hooks/useStreaks';
import type { ApiStreak } from '../../core/api/health';

interface StreakTile {
  label: string;
  icon: string;
  tone: 'workout' | 'food' | 'primary';
  streak: ApiStreak | null;
}

/**
 * Whether this streak is the user's personal best — the web's rule verbatim
 * (`frontend/src/components/home/StreakCard.tsx:33`). `bestCount > 1` keeps a first-ever
 * day-one streak from being announced as a record.
 */
export function isPersonalBest(streak: ApiStreak): boolean {
  return streak.currentCount >= streak.bestCount && streak.bestCount > 1;
}

/**
 * Workout / food / water streaks, with the personal-best trophy.
 *
 * Renders NOTHING when every streak is zero, exactly as the web card does
 * (`StreakCard.tsx:22`) — a brand-new account gets no empty shell announcing three zeros.
 * Same reason it renders nothing while loading: a card that appears, says 0, then says 4 is
 * worse than one that appears once.
 */
export function StreakCard() {
  const { colors } = useThemeContext();
  const { workoutStreak, foodStreak, waterStreak, streaksLoading } = useStreaks();

  const styles = useThemedStyles((colors) => ({
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    tile: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
    },
    count: {
      color: colors.sleep,
      fontWeight: '800',
    },
    label: {
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    best: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    bestText: {
      color: colors.sleep,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    bestCount: {
      color: colors.textMuted,
    },
  }));

  const tiles: StreakTile[] = [
    { label: 'Workout', icon: 'dumbbell', tone: 'workout', streak: workoutStreak },
    { label: 'Food', icon: 'silverware-fork-knife', tone: 'food', streak: foodStreak },
    { label: 'Water', icon: 'water', tone: 'primary', streak: waterStreak },
  ];

  const active = tiles.filter((t) => t.streak != null && t.streak.currentCount > 0);
  if (streaksLoading || active.length === 0) return null;

  const toneColor = { workout: colors.workout, food: colors.food, primary: colors.workout };

  return (
    <SectionCard icon="fire" title="Streaks" tone="sleep">
      <View style={styles.row}>
        {active.map(({ label, icon, tone, streak }) => (
          <View key={label} style={styles.tile}>
            <Icon source={icon} size={20} color={toneColor[tone]} />
            <Text variant="headlineSmall" style={styles.count}>
              {streak!.currentCount}
            </Text>
            <Text variant="labelSmall" style={styles.label}>
              {label}
            </Text>
            {isPersonalBest(streak!) ? (
              <View style={styles.best}>
                <Icon source="trophy" size={11} color={colors.sleep} />
                <Text variant="labelSmall" style={styles.bestText}>
                  Best
                </Text>
              </View>
            ) : streak!.bestCount > streak!.currentCount ? (
              <View style={styles.best}>
                <Icon source="trophy" size={10} color={colors.textMuted} />
                <Text variant="labelSmall" style={styles.bestCount}>
                  {streak!.bestCount}
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </SectionCard>
  );
}
