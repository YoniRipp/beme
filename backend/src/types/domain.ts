/**
 * Domain types — single source of truth for all entity shapes.
 * Models, services, and controllers import from here.
 */

// ─── Workout ────────────────────────────────────────────────
export type WorkoutType = 'strength' | 'cardio' | 'flexibility' | 'sports';

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  repsPerSet?: number[];
  weight?: number;
  notes?: string;
}

export interface Workout {
  id: string;
  date: string;
  title: string;
  type: WorkoutType;
  durationMinutes: number;
  exercises: Exercise[];
  notes?: string;
}

export interface CreateWorkoutInput {
  userId: string;
  date: string;
  title: string;
  type: WorkoutType;
  durationMinutes: number;
  exercises: Exercise[];
  notes?: string;
}

export interface UpdateWorkoutInput {
  date?: string;
  title?: string;
  type?: WorkoutType;
  durationMinutes?: number;
  exercises?: Exercise[];
  notes?: string;
}

// ─── Food Entry ─────────────────────────────────────────────
export interface FoodEntry {
  id: string;
  date: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portionAmount?: number;
  portionUnit?: string;
  servingType?: string;
  startTime?: string;
  endTime?: string;
}

export interface CreateFoodEntryInput {
  userId: string;
  date: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portionAmount?: number;
  portionUnit?: string;
  servingType?: string;
  startTime?: string;
  endTime?: string;
}

export interface UpdateFoodEntryInput {
  date?: string;
  name?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  portionAmount?: number;
  portionUnit?: string;
  servingType?: string;
  startTime?: string;
  endTime?: string;
}

// ─── Daily Check-In ─────────────────────────────────────────
export interface DailyCheckIn {
  id: string;
  date: string;
  sleepHours?: number;
}

export interface CreateCheckInInput {
  userId: string;
  date: string;
  sleepHours?: number | null;
}

export interface UpdateCheckInInput {
  date?: string;
  sleepHours?: number | null;
}

// ─── Goal ───────────────────────────────────────────────────
export type GoalType = 'calories' | 'workouts' | 'sleep';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Goal {
  id: string;
  type: GoalType;
  target: number;
  period: GoalPeriod;
  createdAt?: string;
}

export interface CreateGoalInput {
  userId: string;
  type: GoalType;
  target: number;
  period: GoalPeriod;
}

export interface UpdateGoalInput {
  type?: GoalType;
  target?: number;
  period?: GoalPeriod;
}

// ─── Pagination ─────────────────────────────────────────────
export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ─── API Error ──────────────────────────────────────────────
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ─── Trainer ───────────────────────────────────────────────
export type TrainerClientStatus = 'pending' | 'active' | 'removed';
export type TrainerInvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface TrainerClient {
  id: string;
  trainerId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  status: TrainerClientStatus;
  createdAt: string;
}

export interface TrainerInvitation {
  id: string;
  trainerId: string;
  email?: string;
  inviteCode?: string;
  status: TrainerInvitationStatus;
  expiresAt: string;
  createdAt: string;
}
