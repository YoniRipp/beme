import { useMemo } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import {
  getFitnessInsights,
  getHealthInsights,
  getWorkoutFrequencyData,
  getCalorieTrendData,
  calculateTrends,
  CHART_COLORS,
} from '@/lib/analytics';
import { FitnessInsightsSection } from '@/components/insights/FitnessInsightsSection';
import { HealthInsightsSection } from '@/components/insights/HealthInsightsSection';
import { AiInsightsSection } from '@/components/insights/AiInsightsSection';

export function Insights() {
  const { isPro } = useSubscription();
  const { workouts } = useWorkouts();
  const { foodEntries, checkIns } = useEnergy();

  const fitnessInsights = useMemo(() => getFitnessInsights(workouts), [workouts]);
  const healthInsights = useMemo(() => getHealthInsights(foodEntries, checkIns), [foodEntries, checkIns]);

  const workoutFrequency = useMemo(
    () => getWorkoutFrequencyData(workouts, 12),
    [workouts]
  );
  const calorieTrend = useMemo(() => getCalorieTrendData(foodEntries, 30), [foodEntries]);

  const workoutTrendData = useMemo(() => {
    return calculateTrends(workouts, () => 1, 'week');
  }, [workouts]);

  const workoutTypePieData = useMemo(() => {
    const typeCounts = new Map<string, number>();
    workouts.forEach((w) => {
      typeCounts.set(w.type, (typeCounts.get(w.type) || 0) + 1);
    });
    return Array.from(typeCounts.entries()).map(([name, value], idx) => ({
      name,
      value,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [workouts]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {isPro ? (
        <AiInsightsSection />
      ) : (
        <UpgradePrompt feature="AI Insights" description="Get personalized AI-powered analytics and daily recommendations about your health, fitness, and habits." />
      )}
      <FitnessInsightsSection
        workoutFrequency={workoutFrequency}
        workoutTrendData={workoutTrendData}
        workoutTypePieData={workoutTypePieData}
        fitnessInsights={fitnessInsights}
      />
      <HealthInsightsSection calorieTrend={calorieTrend} healthInsights={healthInsights} />
    </div>
  );
}
