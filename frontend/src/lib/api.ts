/// <reference types="vite/client" />

// Core client and token helpers
export {
  getApiBase,
  getToken,
  setToken,
  request,
  type RequestOptions,
} from '@/core/api/client';

// Auth
export { authApi, type ApiUser, type AuthResponse } from '@/core/api/auth';

// Goals
export { goalsApi, type ApiGoal } from '@/core/api/goals';

// Workouts
export { workoutsApi, type ApiWorkout } from '@/core/api/workouts';

// Food entries, daily check-ins, food search
export {
  foodEntriesApi,
  dailyCheckInsApi,
  searchFoods,
  type ApiFoodEntry,
  type ApiDailyCheckIn,
  type FoodSearchResult,
} from '@/core/api/food';

// Users (admin)
export { usersApi, type ApiUserListItem } from '@/core/api/users';
