import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { Button } from '../ui';
import Toast from 'react-native-toast-message';
import { fonts, radius, spacing } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { toLocalDateString } from '../../lib/dateRanges';
import { SectionCard } from '../shared/SectionCard';
import { useCycle } from '../../hooks/useCycle';
import { useProfile } from '../../hooks/useProfile';

/** The web's fallback when the profile has no `averageCycleLength` (`CycleTracker.tsx:13`). */
export const DEFAULT_CYCLE_LENGTH_DAYS = 28;

/** Days until the next period is expected, or `null` when there is no cycle day yet. */
export function daysUntilNextPeriod(
  currentCycleDay: number | null,
  cycleLength: number
): number | null {
  if (currentCycleDay == null) return null;
  return Math.max(0, cycleLength - currentCycleDay);
}

/**
 * Cycle day, days to the next period, and a log-period-start control.
 *
 * Rendered by Home only when `profile.cycleTrackingEnabled`, exactly as the web gates it
 * (`frontend/src/pages/Home.tsx:294`). The Expo counterpart of
 * `frontend/src/components/home/CycleTracker.tsx`, without its inline SVG ring — the ring
 * carried the same number the heading already states, and one 12px dial repeating "day 14
 * of 28" is not worth an `Svg` on a card this small.
 */
export function CycleCard() {
  const { currentCycleDay, addCycleEntry } = useCycle();
  const { profile } = useProfile();
  const cycleLength = profile.averageCycleLength ?? DEFAULT_CYCLE_LENGTH_DAYS;
  const [logging, setLogging] = useState(false);
  const daysUntilNext = daysUntilNextPeriod(currentCycleDay, cycleLength);

  const styles = useThemedStyles((colors) => ({
    value: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
    },
    day: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontWeight: '800',
    },
    of: {
      color: colors.textMuted,
    },
    track: {
      height: 6,
      borderRadius: radius.sm,
      // The unfilled remainder, so `muted` and not `surfaceMuted`: they read as synonyms
      // and are not the same value. `surfaceMuted` (`--paper-2`) against this card is
      // 1.03:1 in dark, the default theme -- the track vanishes and the bar reads full at
      // every value. `muted` is 1.19:1, and is what ProgressRing and MobileGoalCard use.
      backgroundColor: colors.muted,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.sm,
      backgroundColor: colors.food,
    },
    hint: {
      color: colors.textMuted,
    },
    empty: {
      color: colors.textMuted,
    },
    action: {
      alignSelf: 'flex-start',
      borderRadius: radius.lg,
    },
  }));

  const handleLogPeriod = async () => {
    setLogging(true);
    try {
      await addCycleEntry({ date: toLocalDateString(new Date()), periodStart: true, flow: 'medium' });
      Toast.show({ type: 'success', text1: 'Period start logged' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not log entry' });
    } finally {
      setLogging(false);
    }
  };

  const progress = currentCycleDay != null ? Math.min(currentCycleDay / cycleLength, 1) : 0;

  return (
    <SectionCard icon="heart" title="Cycle" tone="food">
      {currentCycleDay != null ? (
        <>
          <View style={styles.value}>
            <Text variant="headlineSmall" style={styles.day}>
              Day {currentCycleDay}
            </Text>
            <Text variant="bodySmall" style={styles.of}>
              of ~{cycleLength}
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
          <Text variant="bodySmall" style={styles.hint}>
            {daysUntilNext != null && daysUntilNext > 0
              ? `~${daysUntilNext} days until next period`
              : 'Period expected soon'}
          </Text>
        </>
      ) : (
        <Text variant="bodyMedium" style={styles.empty}>
          No cycle data yet
        </Text>
      )}
      <Button
        mode="outlined"
        onPress={handleLogPeriod}
        loading={logging}
        disabled={logging}
        style={styles.action}
      >
        Log Period Start
      </Button>
    </SectionCard>
  );
}
