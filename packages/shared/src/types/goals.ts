export type GoalType = 'calories' | 'workouts' | 'sleep';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Goal {
  id: string;
  type: GoalType;
  target: number;
  period: GoalPeriod;
  createdAt: Date;
  // Note: 'current' is calculated, not stored
}

export const GOAL_TYPES: GoalType[] = ['calories', 'workouts', 'sleep'];
export const GOAL_PERIODS: GoalPeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];
