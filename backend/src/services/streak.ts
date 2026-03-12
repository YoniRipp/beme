/**
 * Streak service — business logic for activity streaks.
 */
import * as streakModel from '../models/streak.js';
import { publishEvent } from '../events/publish.js';
import type { Streak } from '../types/domain.js';

export async function list(userId: string): Promise<Streak[]> {
  return streakModel.findByUserId(userId);
}

export async function recordActivity(userId: string, type: string, date?: string): Promise<Streak> {
  const effectiveDate = date ?? new Date().toISOString().slice(0, 10);
  const { streak, milestone } = await streakModel.upsertActivity(userId, type, effectiveDate);

  if (milestone) {
    await publishEvent('body.StreakMilestone', {
      streakId: streak.id,
      type: streak.type,
      milestone,
      currentCount: streak.currentCount,
    }, userId);
  }

  return streak;
}
