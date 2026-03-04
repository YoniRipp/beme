import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useWorkouts } from '../hooks/useWorkouts';
import { useEnergy } from '../hooks/useEnergy';
import { LoadingView } from '../components/shared/LoadingView';
import { EmptyState } from '../components/shared/EmptyState';
import {
  getFitnessInsights,
  getHealthInsights,
  getWorkoutFrequencyData,
  getCalorieTrendData,
  CHART_COLORS,
} from '../lib/analytics';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

export function InsightsScreen() {
  const { workouts, workoutsLoading } = useWorkouts();
  const { foodEntries, checkIns, energyLoading } = useEnergy();
  const loading = workoutsLoading || energyLoading;

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
  if (workouts.length === 0 && foodEntries.length === 0) {
    return <EmptyState icon="chart-line" title="No data yet" subtitle="Log workouts and food to see insights" />;
  }

  const barData = freqData.map((d) => ({ value: d.count, label: d.week, frontColor: '#3b82f6' }));
  const lineData = calorieData.map((d) => ({ value: d.calories, label: d.date }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {workouts.length > 0 && (
        <Card style={styles.card} mode="outlined">
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
        <Card style={styles.card} mode="outlined">
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
        <Card style={styles.card} mode="outlined">
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

      <Card style={styles.card} mode="outlined">
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
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 16 },
  cardTitle: { fontWeight: '600', marginBottom: 4 },
  subtitle: { color: '#6b7280', marginBottom: 12 },
  chartLabel: { fontSize: 8, color: '#9ca3af' },
  pieContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  legend: { gap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statItem: { width: '50%', paddingVertical: 8, alignItems: 'center' },
  statValue: { fontWeight: '700', color: '#111827' },
  statLabel: { color: '#6b7280', textAlign: 'center' },
});
