import React from 'react';
import { View, Pressable } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { Button } from '../ui';
import { targetFraction, type DailyTargets } from '@trackvibe/shared/domain';
import { fonts, radius, spacing } from '../../theme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { ProgressRing } from '../shared/ProgressRing';
import { SectionCard } from '../shared/SectionCard';

/** Large enough to be the biggest thing on the screen, small enough to leave room for the bars at 390px. */
const RING_SIZE = 116;

export interface MacroRow {
  label: string;
  current: number;
  target: number | null;
  /** Which themed role paints the bar — the web's info / gold / terracotta trio. */
  tone: 'workout' | 'sleep' | 'food';
}

/** "72/120g" once a target exists, "72g" until then — never "72/300g" out of thin air. */
export function gramsAgainstTarget(current: number, target: number | null): string {
  const rounded = Math.round(current);
  return target != null ? `${rounded}/${target}g` : `${rounded}g`;
}

/** The three macro bars beside the ring, in the web's order. */
export function buildMacroRows(
  todayProtein: number,
  todayCarbs: number,
  todayFats: number,
  targets: DailyTargets
): MacroRow[] {
  return [
    { label: 'Protein', current: todayProtein, target: targets.protein, tone: 'workout' },
    { label: 'Carbs', current: todayCarbs, target: targets.carbs, tone: 'sleep' },
    { label: 'Fat', current: todayFats, target: targets.fat, tone: 'food' },
  ];
}

interface FuelCardProps {
  todayCalories: number;
  todayProtein: number;
  todayCarbs: number;
  todayFats: number;
  targets: DailyTargets;
  mealsLabel: string;
  /** The food query only. See the docblock — this card must not wait on anything else. */
  loading: boolean;
  /** Goals and profile still in flight: the targets are unknown, which is not the same as unset. */
  targetsLoading: boolean;
  /** Opens the goal form on the `calories`/`daily` row — the store that owns the kcal target. */
  onEditCalorieTarget: () => void;
  /** Opens the macro editor, which writes GRAMS to the profile — a different store. */
  onEditMacroTargets: () => void;
}

/**
 * Today's fuel: the calorie ring and the three macro bars.
 *
 * GATED ON THE FOOD QUERY ALONE, which is the point of this card's rewrite. Expo used to
 * hide the entire screen — greeting included — behind
 * `goalsLoading || workoutsLoading || energyLoading`, so the number people open the app for
 * waited on a whole-history workouts read it does not use. The web has the opposite layering
 * and says why (`frontend/src/pages/Home.tsx:179-180`): this card "is the reason people open
 * the app, so it must not wait on the workouts query behind it."
 *
 * `targetsLoading` is separate on purpose. An unresolved target is not an absent one, and
 * offering "Set a daily calorie target" while the goals query is still in flight invites a
 * user who already has one to set the goal they already have.
 *
 * THE MACRO BARS ARE A CONTROL, as the web's are. Tapping them opens `MacroTargetsModal`,
 * which writes macro GRAMS to the profile — the same store the web's `DailyTargetsModal`
 * writes, through the `useProfile` hook this client already had.
 *
 * They were inert until then, and the note here used to explain why: there was no profile
 * EDITOR on Expo, so a pencil that opened the calorie-goal form while its label said "Edit
 * Protein target" would have been a lie. For an Expo-only account that left the three bars
 * permanently at zero — able to fill, never filling, with nowhere in the app to say what
 * they should fill against.
 *
 * Calories keep their own separate affordance below, because they are a separate STORE: the
 * goals table's `calories`/`daily` row, not the profile. Folding both into one editor here
 * would put two validation paths behind one number.
 */
export function FuelCard({
  todayCalories,
  todayProtein,
  todayCarbs,
  todayFats,
  targets,
  mealsLabel,
  loading,
  targetsLoading,
  onEditCalorieTarget,
  onEditMacroTargets,
}: FuelCardProps) {
  const { colors } = useThemeContext();
  const styles = useThemedStyles((colors) => ({
    eyebrow: {
      color: colors.primary,
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
    body: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    macros: {
      flex: 1,
      gap: spacing.md,
    },
    macroRow: {
      gap: spacing.xs,
    },
    macroHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    macroLabel: {
      color: colors.text,
      fontFamily: fonts.semibold,
      fontWeight: '600',
    },
    macroValue: {
      color: colors.textMuted,
    },
    macroTrack: {
      height: 8,
      borderRadius: radius.sm,
      // The unfilled remainder, so `muted` and not `surfaceMuted`: they read as synonyms
      // and are not the same value. `surfaceMuted` (`--paper-2`) against this card is
      // 1.03:1 in dark, the default theme -- the track vanishes and the bar reads full at
      // every value. `muted` is 1.19:1, and is what ProgressRing and MobileGoalCard use.
      backgroundColor: colors.muted,
      overflow: 'hidden',
    },
    macroFill: {
      height: '100%',
      borderRadius: radius.sm,
    },
    summary: {
      color: colors.textMuted,
    },
    skeleton: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    action: {
      alignSelf: 'flex-start',
    },
  }));

  const calorieTarget = targets.calories;
  const calorieFraction = targetFraction(todayCalories, calorieTarget) ?? 0;
  const rounded = Math.round(todayCalories);
  const toneColor = { workout: colors.workout, sleep: colors.sleep, food: colors.food };

  return (
    <SectionCard>
      <Text variant="labelLarge" style={styles.eyebrow}>
        Today&apos;s fuel
      </Text>

      {loading ? (
        <View style={styles.skeleton} accessibilityLiveRegion="polite">
          <ActivityIndicator accessibilityLabel="Loading today's fuel" />
        </View>
      ) : (
        <>
          <View style={styles.body}>
            <ProgressRing
              value={calorieFraction * 100}
              size={RING_SIZE}
              strokeWidth={10}
              displayValue={String(rounded)}
              // `null` target is not a 0% ring: one says "nothing logged against your goal",
              // the other says "there is no goal". The caption is what tells them apart.
              label={calorieTarget != null ? `of ${calorieTarget} kcal` : 'kcal in'}
            />

            <Pressable
              onPress={onEditMacroTargets}
              accessibilityRole="button"
              accessibilityLabel="Edit daily macro targets"
              style={styles.macros}
            >
              {buildMacroRows(todayProtein, todayCarbs, todayFats, targets).map((row) => {
                const pct = targetFraction(row.current, row.target) ?? 0;
                return (
                  <View key={row.label} style={styles.macroRow}>
                    <View style={styles.macroHead}>
                      <Text variant="bodySmall" style={styles.macroLabel}>
                        {row.label}
                      </Text>
                      <Text variant="bodySmall" style={styles.macroValue}>
                        {gramsAgainstTarget(row.current, row.target)}
                      </Text>
                    </View>
                    <View style={styles.macroTrack}>
                      <View
                        style={[
                          styles.macroFill,
                          { width: `${pct * 100}%`, backgroundColor: toneColor[row.tone] },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </Pressable>
          </View>

          <Text variant="bodySmall" style={styles.summary}>
            {mealsLabel}
          </Text>

          {!targetsLoading && (
            <Button
              mode="text"
              compact
              icon={calorieTarget != null ? 'pencil' : 'target'}
              onPress={onEditCalorieTarget}
              style={styles.action}
              accessibilityLabel={
                calorieTarget != null ? 'Edit daily calorie target' : 'Set a daily calorie target'
              }
            >
              {calorieTarget != null ? 'Edit calorie target' : 'Set a daily calorie target'}
            </Button>
          )}
        </>
      )}
    </SectionCard>
  );
}
