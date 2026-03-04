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
  date: Date;
  title: string;
  type: WorkoutType;
  durationMinutes: number;
  exercises: Exercise[];
  notes?: string;
}

export const WORKOUT_TYPES: WorkoutType[] = ['strength', 'cardio', 'flexibility', 'sports'];
