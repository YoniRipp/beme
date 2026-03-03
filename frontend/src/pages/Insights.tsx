import { useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useSettings } from '@/hooks/useSettings';
import { useExchangeRates } from '@/features/money/useExchangeRates';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import {
  getSpendingInsights,
  getFitnessInsights,
  getHealthInsights,
  getSpendingTrendData,
  getWorkoutFrequencyData,
  getCalorieTrendData,
  calculateTrends,
  CHART_COLORS,
} from '@/lib/analytics';
import { FinancialInsightsSection } from '@/components/insights/FinancialInsightsSection';
import { FitnessInsightsSection } from '@/components/insights/FitnessInsightsSection';
import { HealthInsightsSection } from '@/components/insights/HealthInsightsSection';
import { AiInsightsSection } from '@/components/insights/AiInsightsSection';

export function Insights() {
  const { isPro } = useSubscription();
  const { transactions } = useTransactions();
  const { settings } = useSettings();
  const displayCurrency = settings.currency;
  const fromCurrencies = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.currency ?? 'USD'))),
    [transactions]
  );
  const { convertToDisplay } = useExchangeRates(displayCurrency, fromCurrencies);
  const convertedTransactions = useMemo(
    () =>
      transactions.map((t) => ({
        ...t,
        amount: convertToDisplay(t.amount, t.currency ?? 'USD'),
      })),
    [transactions, convertToDisplay]
  );
  const { workouts } = useWorkouts();
  const { foodEntries, checkIns } = useEnergy();

  const spendingInsights = useMemo(
    () => getSpendingInsights(convertedTransactions),
    [convertedTransactions]
  );
  const fitnessInsights = useMemo(() => getFitnessInsights(workouts), [workouts]);
  const healthInsights = useMemo(() => getHealthInsights(foodEntries, checkIns), [foodEntries, checkIns]);

  const spendingTrend = useMemo(
    () => getSpendingTrendData(convertedTransactions, 12),
    [convertedTransactions]
  );
  const workoutFrequency = useMemo(
    () => getWorkoutFrequencyData(workouts, 12),
    [workouts]
  );
  const calorieTrend = useMemo(() => getCalorieTrendData(foodEntries, 30), [foodEntries]);

  const spendingTrendData = useMemo(() => {
    return calculateTrends(
      convertedTransactions.filter((t) => t.type === 'expense'),
      (t) => t.amount,
      'month'
    );
  }, [convertedTransactions]);

  const workoutTrendData = useMemo(() => {
    return calculateTrends(workouts, () => 1, 'week');
  }, [workouts]);

  const categoryPieData = useMemo(
    () =>
      spendingInsights.topCategories.map((cat, idx) => ({
        name: cat.category,
        value: cat.amount,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      })),
    [spendingInsights.topCategories]
  );

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
        <UpgradePrompt feature="AI Insights" description="Get personalized AI-powered analytics and daily recommendations about your health, finances, and habits." />
      )}
      <FinancialInsightsSection
        spendingTrend={spendingTrend}
        spendingTrendData={spendingTrendData}
        categoryPieData={categoryPieData}
        spendingInsights={spendingInsights}
        displayCurrency={displayCurrency}
      />
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
