// Date helpers now live in @trackvibe/shared so both clients share one definition.
// This module stays as a re-export so existing import sites keep working.
export {
  toLocalDateString,
  parseLocalDateString,
  WEEK_SUNDAY,
  getPeriodRange,
  getTrendPeriodBounds,
} from '@trackvibe/shared/domain';
export type { PeriodKey, TrendPeriodKey, TrendPeriodBounds } from '@trackvibe/shared/domain';
