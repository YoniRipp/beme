import { Goal, GoalType, GoalPeriod } from '../../types/goals';

export function apiGoalToGoal(a: {
  id: string;
  type: string;
  target: number;
  period: string;
  createdAt: string;
}): Goal {
  return {
    id: a.id,
    type: a.type as GoalType,
    target: a.target,
    period: a.period as GoalPeriod,
    createdAt: new Date(a.createdAt),
  };
}
