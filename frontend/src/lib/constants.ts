import { User } from '@/types/user';
import { Workout } from '@/types/workout';
import { DailyCheckIn } from '@/types/energy';

// Mock User (fallback for tests or when auth is not required)
export const MOCK_USER: User = {
  id: 'user-001',
  name: 'Jonathan',
  email: 'jonathan@example.com',
  role: 'user',
};

// Sample Workouts
export const SAMPLE_WORKOUTS: Workout[] = [
  {
    id: 'workout-001',
    date: new Date(2025, 0, 16),
    title: 'Chest and Shoulders',
    type: 'strength',
    durationMinutes: 60,
    exercises: [
      { name: 'Bench Press', sets: 3, reps: 10, weight: 135 },
      { name: 'Shoulder Press', sets: 3, reps: 12, weight: 75 },
      { name: 'Push-ups', sets: 3, reps: 15 }
    ],
    notes: 'Great workout, felt strong!'
  },
  {
    id: 'workout-002',
    date: new Date(2025, 0, 14),
    title: 'Back and Biceps',
    type: 'strength',
    durationMinutes: 55,
    exercises: [
      { name: 'Pull-ups', sets: 3, reps: 8 },
      { name: 'Barbell Rows', sets: 3, reps: 10, weight: 95 },
      { name: 'Bicep Curls', sets: 3, reps: 12, weight: 30 }
    ]
  },
  {
    id: 'workout-003',
    date: new Date(2025, 0, 12),
    title: 'Legs',
    type: 'strength',
    durationMinutes: 70,
    exercises: [
      { name: 'Squats', sets: 4, reps: 8, weight: 185 },
      { name: 'Leg Press', sets: 3, reps: 12, weight: 270 },
      { name: 'Lunges', sets: 3, reps: 10 }
    ]
  }
];

// Sample Energy Check-ins (simplified to only sleep)
export const SAMPLE_ENERGY: DailyCheckIn[] = [
  {
    id: 'energy-001',
    date: new Date(2025, 0, 16),
    sleepHours: 7.5
  },
  {
    id: 'energy-002',
    date: new Date(2025, 0, 15),
    sleepHours: 7
  },
  {
    id: 'energy-003',
    date: new Date(2025, 0, 14),
    sleepHours: 8
  }
];

// Limits for validation
export const LIMITS = {
  MAX_TRANSACTION_AMOUNT: 1000000,
  MIN_TRANSACTION_AMOUNT: 0.01,
  MAX_WORKOUT_DURATION: 480, // 8 hours in minutes
  MIN_WORKOUT_DURATION: 1,
  MAX_CALORIES: 10000,
  MIN_CALORIES: 0,
  MAX_PROTEIN: 500, // grams
  MAX_CARBS: 1000, // grams
  MAX_FATS: 500, // grams
  MAX_SLEEP_HOURS: 24,
  MIN_SLEEP_HOURS: 0,
  MAX_EXERCISE_SETS: 100,
  MAX_EXERCISE_REPS: 1000,
  MAX_EXERCISE_WEIGHT: 1000, // lbs/kg
} as const;

// Default values for forms
export const DEFAULTS = {
  WORKOUT_DURATION: 60, // minutes
  EXERCISE_SETS: 3,
  EXERCISE_REPS: 10,
  SLEEP_HOURS: 8,
} as const;

// Validation rules
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  TIME_REGEX: /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format (two-digit hour)
  DATE_ISO_REGEX: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  POSITIVE_NUMBER_REGEX: /^\d+(\.\d+)?$/,
  NON_NEGATIVE_NUMBER_REGEX: /^\d+(\.\d+)?$/,
} as const;
