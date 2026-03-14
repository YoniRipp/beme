import * as goalService from '../goal.js';
import { resolveGoal } from './resolvers.js';
import type { VoiceAction, ExecuteResult } from './types.js';
import type { GoalType, GoalPeriod } from '../../types/domain.js';

export async function handleAddGoal(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  await goalService.create(userId, {
    type: ((action.type as string) ?? 'workouts') as GoalType,
    target: Number(action.target) || 0,
    period: ((action.period as string) ?? 'weekly') as GoalPeriod,
  });
  return { intent: 'add_goal', success: true, message: `Added goal: ${Number(action.target) || 0} ${(action.type as string) ?? 'workouts'} ${(action.period as string) ?? 'weekly'}` };
}

export async function handleEditGoal(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const g = await resolveGoal(userId, action);
  if (!g) return { intent: 'edit_goal', success: false, message: 'Goal not found' };
  await goalService.update(userId, g.id as string, {
    target: action.target != null ? Number(action.target) : undefined,
    period: action.period as GoalPeriod | undefined,
  });
  return { intent: 'edit_goal', success: true, message: 'Updated goal target' };
}

export async function handleDeleteGoal(userId: string, action: VoiceAction): Promise<ExecuteResult> {
  const g = await resolveGoal(userId, action);
  if (!g) return { intent: 'delete_goal', success: false, message: 'Goal not found' };
  await goalService.remove(userId, g.id as string);
  return { intent: 'delete_goal', success: true, message: 'Deleted goal' };
}
