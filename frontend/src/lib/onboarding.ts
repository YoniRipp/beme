import { storage } from './storage';

const ONBOARDING_KEY = 'beme_onboarding_completed';

export interface OnboardingStep {
  target: string; // CSS selector or element ID
  content: string;
  title: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    target: '[data-onboarding="home"]',
    title: 'Welcome to BeMe!',
    content: 'This is your dashboard. Track your workouts, energy levels, and goals all in one place.',
    position: 'bottom',
  },
  {
    target: '[data-onboarding="body"]',
    title: 'Workout Tracking',
    content: 'Log your workouts and track your fitness progress. Save workout templates for quick access.',
    position: 'top',
  },
  {
    target: '[data-onboarding="energy"]',
    title: 'Energy & Nutrition',
    content: 'Track your food intake and sleep. Monitor your calorie balance and macros.',
    position: 'top',
  },
  {
    target: '[data-onboarding="insights"]',
    title: 'Insights & Analytics',
    content: 'View detailed analytics and trends for your fitness and health data.',
    position: 'top',
  },
];

/**
 * Check if onboarding has been completed
 */
export function isOnboardingCompleted(): boolean {
  return storage.get<boolean>(ONBOARDING_KEY) || false;
}

/**
 * Mark onboarding as completed
 */
export function completeOnboarding(): void {
  storage.set(ONBOARDING_KEY, true);
}

/**
 * Reset onboarding (for testing or user preference)
 */
export function resetOnboarding(): void {
  storage.remove(ONBOARDING_KEY);
}
