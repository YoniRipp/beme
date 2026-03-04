import { describe, it, expect } from 'vitest';
import { subDays } from 'date-fns';
import {
  calculateTrends,
  getFitnessInsights,
  getHealthInsights,
} from './analytics';
import { Workout } from '@/types/workout';
import { FoodEntry, DailyCheckIn } from '@/types/energy';

describe('analytics', () => {
  describe('calculateTrends', () => {
    it('calculates weekly trends', () => {
      const data = [
        { date: new Date(), amount: 100 },
        { date: new Date(), amount: 200 },
      ];

      const result = calculateTrends(data, (item) => item.amount, 'week');

      expect(result).toBeDefined();
      expect(result.current).toBe(300);
    });

    it('calculates monthly trends', () => {
      const data = [
        { date: new Date(), amount: 100 },
        { date: new Date(), amount: 200 },
      ];

      const result = calculateTrends(data, (item) => item.amount, 'month');

      expect(result).toBeDefined();
      expect(result.current).toBe(300);
    });

    it('calculates yearly trends', () => {
      const data = [
        { date: new Date(), amount: 100 },
        { date: new Date(), amount: 200 },
      ];

      const result = calculateTrends(data, (item) => item.amount, 'year');

      expect(result).toBeDefined();
      expect(result.current).toBe(300);
    });
  });

  describe('getFitnessInsights', () => {
    it('calculates fitness insights from workouts', () => {
      const workouts: Workout[] = [
        {
          id: '1',
          title: 'Morning Run',
          type: 'cardio',
          date: new Date(),
          durationMinutes: 30,
          exercises: [],
        },
        {
          id: '2',
          title: 'Strength Training',
          type: 'strength',
          date: new Date(),
          durationMinutes: 45,
          exercises: [],
        },
      ];

      const insights = getFitnessInsights(workouts);

      expect(insights).toBeDefined();
      expect(insights.totalWorkouts).toBe(2);
      expect(insights.averageDuration).toBe(37.5);
    });

    it('handles empty workouts', () => {
      const insights = getFitnessInsights([]);

      expect(insights.totalWorkouts).toBe(0);
      expect(insights.averageDuration).toBe(0);
    });
  });

  describe('getHealthInsights', () => {
    it('calculates health insights from food entries and check-ins', () => {
      const now = new Date();
      const day1 = subDays(now, 2);
      const day2 = subDays(now, 1);
      const foodEntries: FoodEntry[] = [
        {
          id: '1',
          date: day1,
          name: 'Chicken',
          calories: 300,
          protein: 50,
          carbs: 0,
          fats: 10,
        },
        {
          id: '2',
          date: day2,
          name: 'Rice',
          calories: 200,
          protein: 5,
          carbs: 45,
          fats: 1,
        },
      ];

      const checkIns: DailyCheckIn[] = [
        {
          id: '1',
          date: day1,
          sleepHours: 7.5,
        },
        {
          id: '2',
          date: day2,
          sleepHours: 8,
        },
      ];

      const insights = getHealthInsights(foodEntries, checkIns);

      expect(insights).toBeDefined();
      expect(insights.averageDailyCalories).toBe(250);
      expect(insights.averageSleepHours).toBe(7.75);
    });

    it('handles empty data', () => {
      const insights = getHealthInsights([], []);

      expect(insights.averageDailyCalories).toBe(0);
      expect(insights.averageSleepHours).toBe(0);
    });
  });
});
