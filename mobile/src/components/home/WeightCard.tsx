import React from 'react';
import { View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { summarizeWeight } from '@trackvibe/shared/domain';
import { fonts, radius, spacing } from '../../theme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { SectionCard } from '../shared/SectionCard';
import { useWeight } from '../../hooks/useWeight';
import { useProfile } from '../../hooks/useProfile';

interface WeightCardProps {
  /** Opens the weight form. The whole card is the control, as it is on the web. */
  onLogWeight: () => void;
}

/**
 * Latest weight, distance to target, weekly trend and a seven-reading sparkline — the Expo
 * counterpart of `frontend/src/components/home/WeightProgress.tsx`.
 *
 * The arithmetic is `summarizeWeight` in `@trackvibe/shared/domain`, shared with that
 * component so the two cards cannot disagree about what "trend" means.
 */
export function WeightCard({ onLogWeight }: WeightCardProps) {
  const { colors } = useThemeContext();
  const { weightEntries, weightLoading } = useWeight();
  const { profile } = useProfile();
  const { current, target, diffToTarget, trend, bars } = summarizeWeight(
    weightEntries,
    profile.targetWeight
  );

  const styles = useThemedStyles((colors) => ({
    logHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
    },
    logHintText: {
      color: colors.primary,
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
    value: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs,
    },
    current: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontWeight: '800',
    },
    unit: {
      color: colors.textMuted,
    },
    facts: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.md,
    },
    fact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    factLabel: {
      color: colors.textMuted,
    },
    factValue: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
    sparkline: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.xxs,
      height: 32,
    },
    bar: {
      flex: 1,
      borderTopLeftRadius: radius.sm,
      borderTopRightRadius: radius.sm,
      backgroundColor: colors.primarySoft,
    },
    empty: {
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    emptyText: {
      color: colors.textMuted,
    },
    emptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    emptyCtaText: {
      color: colors.primary,
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
  }));

  const trendTone =
    trend == null ? colors.textMuted : trend < 0 ? colors.success : trend > 0 ? colors.sleep : colors.textMuted;
  const trendIcon = trend == null ? 'minus' : trend < 0 ? 'trending-down' : trend > 0 ? 'trending-up' : 'minus';

  return (
    <SectionCard
      icon="scale-bathroom"
      title="Weight"
      onPress={onLogWeight}
      accessibilityLabel="Log weight"
      trailing={
        <View style={styles.logHint}>
          <Icon source="plus" size={12} color={colors.primary} />
          <Text variant="labelMedium" style={styles.logHintText}>
            Log
          </Text>
        </View>
      }
    >
      {current != null ? (
        <>
          <View style={styles.value}>
            <Text variant="headlineMedium" style={styles.current}>
              {current.toFixed(1)}
            </Text>
            <Text variant="bodyMedium" style={styles.unit}>
              kg
            </Text>
          </View>

          <View style={styles.facts}>
            {target != null && (
              <View style={styles.fact}>
                <Text variant="bodySmall" style={styles.factLabel}>
                  Target
                </Text>
                <Text variant="bodySmall" style={styles.factValue}>
                  {target}kg
                </Text>
                {diffToTarget != null && (
                  <Text
                    variant="bodySmall"
                    style={{ color: diffToTarget > 0 ? colors.sleep : colors.success }}
                  >
                    ({diffToTarget > 0 ? '+' : ''}
                    {diffToTarget.toFixed(1)})
                  </Text>
                )}
              </View>
            )}
            {trend != null && (
              <View style={styles.fact}>
                <Icon source={trendIcon} size={12} color={trendTone} />
                <Text variant="bodySmall" style={styles.factLabel}>
                  {Math.abs(trend).toFixed(1)} kg / wk
                </Text>
              </View>
            )}
          </View>

          {bars.length > 0 && (
            <View style={styles.sparkline}>
              {bars.map((bar) => (
                <View key={bar.key} style={[styles.bar, { height: `${bar.heightPercent}%` }]} />
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.empty}>
          {/* While the first read is in flight there is no answer yet, and "No weight logged
              yet" is a wrong one — an account with a year of readings would see it flash. */}
          <Text variant="bodyMedium" style={styles.emptyText}>
            {weightLoading ? 'Loading your weight…' : 'No weight logged yet'}
          </Text>
          {!weightLoading && (
            // The whole card is already the button; this is a hint, not a second control —
            // the same call the web card's own comment records (`WeightProgress.tsx:104`).
            <View style={styles.emptyCta}>
              <Icon source="plus" size={14} color={colors.primary} />
              <Text variant="bodyMedium" style={styles.emptyCtaText}>
                Log your weight
              </Text>
            </View>
          )}
        </View>
      )}
    </SectionCard>
  );
}
