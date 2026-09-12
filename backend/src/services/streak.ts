/**
 * Streak service — business logic for activity streaks.
 */
import * as streakModel from '../models/streak.js';
import { publishEvent } from '../events/publish.js';
import { toDateString } from '../utils/date.js';
import type { Streak } from '../types/domain.js';

export async function list(userId: string): Promise<Streak[]> {
  return streakModel.findByUserId(userId);
}

export async function recordActivity(userId: string, type: string, date?: string): Promise<Streak> {
  // Local calendar day — upsertActivity compares calendar days, and a UTC-derived
  // "today" is the previous day for the first hours of the morning in any UTC+ zone.
  const effectiveDate = date ?? toDateString(new Date());
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
