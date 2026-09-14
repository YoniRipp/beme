// Trend/insight calculations now live in @trackvibe/shared so both clients share one
// definition. This module stays as a re-export so existing import sites keep working.
//
// CHART_COLORS deliberately stays here: the web resolves `hsl(var(--chart-N))` through
// CSS custom properties so charts follow the theme, which React Native cannot do. It is
// the one symbol in this module that is genuinely platform-specific.
export {
  calculateTrends,
  getFitnessInsights,
  getHealthInsights,
  getWorkoutFrequencyData,
  getCalorieTrendData,
} from '@trackvibe/shared/domain';
export type { TrendData, FitnessInsight, HealthInsight } from '@trackvibe/shared/domain';

/**
 * Series colors for charts. These resolve through the `--chart-*` tokens, so a chart
 * follows the theme instead of staying on a fixed hex that only reads on one ground.
 */
export const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];
