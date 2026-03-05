/**
 * Voice service — HANDLERS and builder logic (pure, no Gemini calls).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HANDLERS } from './voice.js';

vi.mock('../config/index.js', () => ({
  config: { geminiApiKey: 'test-key', voiceExecuteOnServer: false },
}));

vi.mock('../db/index.js', () => ({
  isDbConfigured: vi.fn().mockReturnValue(true),
  getPool: vi.fn(() => ({ query: vi.fn() })),
}));

vi.mock('../models/foodSearch.js', () => ({
  getNutritionForFoodName: vi.fn().mockResolvedValue(null),
  unitToGrams: vi.fn((amount: number) => amount),
  cacheFood: vi.fn().mockResolvedValue(null),
}));

vi.mock('./foodLookupGemini.js', () => ({
  lookupAndCreateFood: vi.fn().mockResolvedValue(null),
}));

describe('voice service HANDLERS', () => {
  const todayStr = '2025-02-24';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('add_workout', () => {
    it('builds merge with title, type, durationMinutes, exercises', async () => {
      const result = await HANDLERS.add_workout(
        {
          title: 'Run',
          type: 'cardio',
          durationMinutes: 45,
          exercises: [{ name: 'Squat', sets: 3, reps: 10 }],
        },
        { todayStr }
      );

      expect(result.merge).toMatchObject({
        title: 'Run',
        type: 'cardio',
        durationMinutes: 45,
        date: todayStr,
      });
      expect(result.merge.exercises).toHaveLength(1);
      expect(result.merge.exercises[0]).toMatchObject({ name: 'Squat', sets: 3, reps: 10 });
    });

    it('defaults title to Workout and duration to 30', async () => {
      const result = await HANDLERS.add_workout({ type: 'strength' }, { todayStr });

      expect(result.merge).toMatchObject({
        title: 'Workout',
        type: 'strength',
        durationMinutes: 30,
      });
    });
  });

  describe('add_food', () => {
    it('builds merge with food, amount, unit, date', async () => {
      const result = await HANDLERS.add_food(
        { food: 'Apple', amount: 150, unit: 'g', date: todayStr },
        { todayStr }
      );

      expect(result).toHaveProperty('merge');
      expect(result.merge).toMatchObject({
        food: 'Apple',
        amount: 150,
        unit: 'g',
        date: todayStr,
      });
    });
  });

  describe('edit_food_entry', () => {
    it('builds merge from mapArgs spec', async () => {
      const result = await HANDLERS.edit_food_entry(
        { entryId: 'e1', name: 'Banana', calories: 100 },
        {}
      );

      expect(result.merge).toMatchObject({
        entryId: 'e1',
        name: 'Banana',
        calories: 100,
      });
    });
  });

  describe('log_sleep', () => {
    it('builds merge with sleepHours and date', async () => {
      const result = await HANDLERS.log_sleep(
        { sleepHours: 7, date: todayStr },
        { todayStr }
      );

      expect(result.merge).toMatchObject({
        sleepHours: 7,
        date: todayStr,
      });
    });

    it('defaults invalid sleepHours to 0', async () => {
      const result = await HANDLERS.log_sleep(
        { sleepHours: 'invalid', date: todayStr },
        { todayStr }
      );

      expect(result.merge.sleepHours).toBe(0);
    });
  });

  describe('add_goal', () => {
    it('builds merge with type, target, period', async () => {
      const result = await HANDLERS.add_goal(
        { type: 'workouts', target: 3, period: 'weekly' },
        {}
      );

      expect(result.merge).toMatchObject({
        type: 'workouts',
        target: 3,
        period: 'weekly',
      });
    });

    it('defaults invalid type to workouts and target to 0', async () => {
      const result = await HANDLERS.add_goal({ type: 'invalid', target: 'x' }, {});

      expect(result.merge).toMatchObject({
        type: 'workouts',
        target: 0,
        period: 'weekly',
      });
    });
  });

  describe('edit_goal', () => {
    it('builds merge from mapArgs', async () => {
      const result = await HANDLERS.edit_goal(
        { goalId: 'g1', target: 5, period: 'daily' },
        {}
      );

      expect(result.merge).toMatchObject({
        goalId: 'g1',
        target: 5,
        period: 'daily',
      });
    });
  });
});
