import React from 'react';
import { View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { radius, spacing } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { SectionCard } from '../shared/SectionCard';
import { useWater } from '../../hooks/useWater';
import { useProfile } from '../../hooks/useProfile';

/** The column's own `NOT NULL DEFAULT 8` (`backend/src/db/schema.ts:228`), as a client fallback. */
export const DEFAULT_WATER_GOAL_GLASSES = 8;

/** Minimum comfortable touch target (`agent-os/standards/frontend/mobile-ui.md`). */
const TOUCH_TARGET = 44;

/**
 * Today's water: glasses against the goal, the ml total, and −/+ controls.
 *
 * The Expo counterpart of `frontend/src/components/home/WaterTracker.tsx`, minus its title
 * link to `/water` — Expo has no water route (recorded in the shell-parity spec as a
 * destination the native client does not have), so a title that navigated nowhere would be
 * worse than a title that does not pretend to.
 */
export function WaterCard() {
  const { glasses, mlTotal, addGlass, removeGlass, waterLoading } = useWater();
  const { profile } = useProfile();
  const goal = profile.waterGoalGlasses || DEFAULT_WATER_GOAL_GLASSES;
  const pct = Math.min(glasses / goal, 1);

  const styles = useThemedStyles((colors) => ({
    value: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs,
    },
    count: {
      color: colors.text,
      fontWeight: '800',
    },
    goal: {
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
      backgroundColor: colors.workout,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    minus: {
      margin: 0,
      width: TOUCH_TARGET,
      height: TOUCH_TARGET,
      borderRadius: TOUCH_TARGET / 2,
      backgroundColor: colors.surfaceMuted,
    },
    add: {
      flex: 1,
      borderRadius: TOUCH_TARGET / 2,
    },
    addContent: {
      height: TOUCH_TARGET,
    },
    ml: {
      color: colors.textMuted,
    },
  }));

  const handleAdd = async () => {
    try {
      await addGlass();
    } catch {
      Toast.show({ type: 'error', text1: 'Could not log water' });
    }
  };

  const handleRemove = async () => {
    if (glasses <= 0) return;
    try {
      await removeGlass();
    } catch {
      Toast.show({ type: 'error', text1: 'Could not update water' });
    }
  };

  return (
    <SectionCard
      icon="water"
      title="Water"
      tone="workout"
      trailing={
        <Text variant="bodySmall" style={styles.ml}>
          {mlTotal} ml
        </Text>
      }
    >
      <View style={styles.value}>
        <Text variant="headlineMedium" style={styles.count}>
          {glasses}
        </Text>
        <Text variant="bodyMedium" style={styles.goal}>
          / {goal} glasses
        </Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>

      {/* Neither control is disabled while a tap is in flight, deliberately: `useWater`
          writes the new count optimistically, so `glasses` here is already the count after
          every tap the user has made — which is what makes the `<= 0` guard correct, and
          what lets someone log four glasses as fast as they can press. `waterLoading` is the
          first read only, where there is genuinely no count to change yet. */}
      <View style={styles.controls}>
        <IconButton
          icon="minus"
          size={18}
          onPress={handleRemove}
          disabled={glasses <= 0 || waterLoading}
          accessibilityLabel="Remove a glass"
          style={styles.minus}
        />
        <Button
          mode="contained"
          icon="plus"
          onPress={handleAdd}
          disabled={waterLoading}
          style={styles.add}
          contentStyle={styles.addContent}
        >
          Add glass
        </Button>
      </View>
    </SectionCard>
  );
}
