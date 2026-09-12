// Trend/insight calculations now live in @trackvibe/shared so both clients share one
// definition. This module stays as a re-export so existing import sites keep working.
//
// CHART_COLORS deliberately stays here: react-native-gifted-charts needs literal color
// values, so this client cannot use the web's `hsl(var(--chart-N))` CSS custom properties.
// It is the one symbol in this module that is genuinely platform-specific.
export {
  calculateTrends,
  getFitnessInsights,
  getHealthInsights,
  getWorkoutFrequencyData,
  getCalorieTrendData,
} from '@trackvibe/shared/domain';
export type { TrendData, FitnessInsight, HealthInsight } from '@trackvibe/shared/domain';

export const CHART_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
