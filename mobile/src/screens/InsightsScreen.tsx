import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { Card } from '../components/ui';
import { useWorkouts } from '../hooks/useWorkouts';
import { useEnergy } from '../hooks/useEnergy';
import { LoadingView } from '../components/shared/LoadingView';
import { EmptyState } from '../components/shared/EmptyState';
import { ErrorNotice } from '../components/shared/ErrorNotice';
import { TruncationNotice } from '../components/shared/TruncationNotice';
import { MobileScreen } from '../components/shared/MobileScreen';
import { insightsHaveData } from '../lib/insightsViewState';
import {
  getFitnessInsights,
  getHealthInsights,
  getWorkoutFrequencyData,
  getCalorieTrendData,
  CHART_COLORS,
} from '../lib/analytics';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useThemeContext } from '../theme/ThemeContext';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { fonts } from '../theme';

export function InsightsScreen() {
  const { colors } = useThemeContext();
  const styles = useThemedStyles((colors) => ({
    card: { marginBottom: 16 },
    cardTitle: { fontFamily: fonts.semibold, fontWeight: '600', marginBottom: 4 },
    subtitle: { color: colors.textMuted, marginBottom: 12 },
    // 10 is the scale's floor (`caption`); this was 8, the only true size violation in
    // `mobile/src`. If the axis labels collide at 10, reduce the tick count rather than the
    // type size — 8px is unreadable on a phone and undoes the a11y pass that produced
    // `--ink-3`.
    chartLabel: { fontSize: 10, fontFamily: fonts.regular, color: colors.textMuted },
    pieContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
    legend: { gap: 4 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    statItem: { width: '50%', paddingVertical: 8, alignItems: 'center' },
    statValue: { fontFamily: fonts.bold, fontWeight: '700', color: colors.text },
    statLabel: { color: colors.textMuted, textAlign: 'center' },
  }));
  const { workouts, workoutsLoading, workoutsError, workoutsTruncated, refetchWorkouts } = useWorkouts();
  const { foodEntries, checkIns, energyLoading, energyError, energyTruncated, refetchEnergy } = useEnergy();
  const loading = workoutsLoading || energyLoading;

  const refreshInsights = useCallback(
    () => Promise.all([refetchEnergy(), refetchWorkouts()]),
    [refetchEnergy, refetchWorkouts],
  );

  const fitness = useMemo(() => getFitnessInsights(workouts), [workouts]);
  const health = useMemo(() => getHealthInsights(foodEntries, checkIns), [foodEntries, checkIns]);
  const freqData = useMemo(() => getWorkoutFrequencyData(workouts, 12), [workouts]);
  const calorieData = useMemo(() => getCalorieTrendData(foodEntries, 30), [foodEntries]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    workouts.forEach((w) => counts.set(w.type, (counts.get(w.type) || 0) + 1));
    return Array.from(counts.entries()).map(([type, count], i) => ({
      value: count,
      text: type,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [workouts]);

  if (loading) return <LoadingView />;
  if (!insightsHaveData({ workouts, foodEntries, checkIns }) && !workoutsError && !energyError) {
    return <EmptyState icon="chart-line" title="No data yet" subtitle="Log workouts, food or sleep to see insights" />;
  }

  const barData = freqData.map((d) => ({ value: d.count, label: d.week, frontColor: colors.primary }));
  const lineData = calorieData.map((d) => ({ value: d.calories, label: d.date }));

  return (
    <MobileScreen title="Patterns" subtitle="Trends from your recent activity." onRefresh={refreshInsights}>
      {/* The last screen still discarding these. `useEnergy` and `useWorkouts` have always
          returned them; without this a failed fetch renders empty charts and `--` stats, which
          reads as "you have no history" rather than "we could not load it". */}
      <ErrorNotice message={energyError ?? workoutsError} />
      {/* Every stat on this screen is an average or a trend over the rows below. If the pager
          clipped them, the numbers are real but they are not the user's whole history. */}
      <TruncationNotice truncated={energyTruncated || workoutsTruncated} />
      {workouts.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Workout Frequency</Text>
            <Text variant="bodySmall" style={styles.subtitle}>Last 12 weeks</Text>
            <BarChart
              data={barData}
              barWidth={16}
              spacing={8}
              noOfSections={5}
              xAxisLabelTextStyle={styles.chartLabel}
              yAxisTextStyle={styles.chartLabel}
              hideRules
              height={150}
            />
          </Card.Content>
        </Card>
      )}

      {typeCounts.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Workout Types</Text>
            <View style={styles.pieContainer}>
              <PieChart data={typeCounts} radius={60} textColor="#fff" textSize={10} showText />
              <View style={styles.legend}>
                {typeCounts.map((t) => (
                  <View key={t.text} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: t.color }]} />
                    <Text variant="bodySmall">{t.text}: {t.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {foodEntries.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Calorie Trend</Text>
            <Text variant="bodySmall" style={styles.subtitle}>Last 30 days</Text>
            <LineChart
              data={lineData}
              color="#ef4444"
              thickness={2}
              noOfSections={5}
              xAxisLabelTextStyle={styles.chartLabel}
              yAxisTextStyle={styles.chartLabel}
              hideRules
              height={150}
              hideDataPoints
              curved
            />
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>{fitness.workoutFrequency}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Workouts/week</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>{fitness.averageDuration > 0 ? `${Math.round(fitness.averageDuration)}` : '--'}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Avg duration (min)</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>{health.averageDailyCalories > 0 ? Math.round(health.averageDailyCalories) : '--'}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Avg daily cal</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>{health.averageSleepHours > 0 ? health.averageSleepHours.toFixed(1) : '--'}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Avg sleep (hrs)</Text>
            </View>
            {/* The three the web shows and this screen did not. All three are already on the
                objects above — `getFitnessInsights`/`getHealthInsights` are the same shared
                functions both clients call, so this is rendering, not computing. */}
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>{fitness.mostCommonType || '--'}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Most common type</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>{health.sleepConsistency > 0 ? `${health.sleepConsistency.toFixed(1)}h` : '--'}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>Sleep std dev</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {health.averageDailyCalories > 0
                  ? `P ${Math.round(health.averageMacros.protein)} · C ${Math.round(health.averageMacros.carbs)} · F ${Math.round(health.averageMacros.fats)}`
                  : '--'}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Avg macros (g)</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </MobileScreen>
  );
}
