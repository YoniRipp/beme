import { z } from 'zod';

// Workout schemas
export const createWorkoutSchema = z.object({
  date: z.string(),
  title: z.string().min(1),
  type: z.string(),
  durationMinutes: z.number().nonnegative(),
  exercises: z.unknown().optional(),
  notes: z.string().optional().nullable(),
});

export const updateWorkoutSchema = z.object({
  date: z.string().optional(),
  title: z.string().min(1).optional(),
  type: z.string().optional(),
  durationMinutes: z.number().nonnegative().optional(),
  exercises: z.unknown().optional(),
  notes: z.string().optional().nullable(),
}).strict();

// Food entry schemas
export const createFoodEntrySchema = z.object({
  date: z.string(),
  name: z.string().min(1),
  calories: z.number().nonnegative().optional().default(0),
  protein: z.number().nonnegative().optional().default(0),
  carbs: z.number().nonnegative().optional().default(0),
  fats: z.number().nonnegative().optional().default(0),
  portionAmount: z.number().nonnegative().optional().nullable(),
  portionUnit: z.string().optional().nullable(),
  servingType: z.string().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
});

export const updateFoodEntrySchema = z.object({
  date: z.string().optional(),
  name: z.string().min(1).optional(),
  calories: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fats: z.number().nonnegative().optional(),
  portionAmount: z.number().nonnegative().optional().nullable(),
  portionUnit: z.string().optional().nullable(),
  servingType: z.string().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
}).strict();

// Daily check-in schemas
export const createCheckInSchema = z.object({
  date: z.string(),
  sleepHours: z.number().nonnegative().optional().nullable(),
});

export const updateCheckInSchema = z.object({
  date: z.string().optional(),
  sleepHours: z.number().nonnegative().optional().nullable(),
}).strict();

// Goal schemas
export const createGoalSchema = z.object({
  type: z.string(),
  target: z.number().nonnegative(),
  period: z.string(),
});

export const updateGoalSchema = z.object({
  type: z.string().optional(),
  target: z.number().nonnegative().optional(),
  period: z.string().optional(),
}).strict();
