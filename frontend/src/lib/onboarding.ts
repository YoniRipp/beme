import { storage } from './storage';

const ONBOARDING_KEY = 'beme_onboarding_completed';
const WELCOME_KEY = 'beme_welcome_completed';

export interface OnboardingStep {
  target: string; // CSS selector or element ID
  content: string;
  title: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    target: '[data-onboarding="dashboard"]',
    title: 'Your Dashboard',
    content: 'This is your daily overview. See your calorie intake, macros, and progress at a glance.',
    position: 'bottom',
  },
  {
    target: '[data-onboarding="voice"]',
    title: 'Voice Commands',
    content: 'Tap the mic to log food or workouts by voice. Just say what you ate or did!',
    position: 'top',
  },
  {
    target: '[data-onboarding="goals"]',
    title: 'Track Your Goals',
    content: 'Set calorie, workout, and sleep goals. Watch your progress update in real-time.',
    position: 'top',
  },
  {
    target: '[data-onboarding="trackers"]',
    title: 'Health Trackers',
    content: 'Track your water intake and weight. Small habits lead to big results.',
    position: 'top',
  },
  {
    target: '[data-onboarding="nav-energy"]',
    title: 'Food & Energy',
    content: 'Go here to see all your food entries, sleep logs, and daily nutrition breakdown.',
    position: 'top',
  },
  {
    target: '[data-onboarding="nav-body"]',
    title: 'Workouts',
    content: 'View and manage your workout history. Log new workouts anytime.',
    position: 'top',
  },
];

/**
 * Check if onboarding tour has been completed
 */
export function isOnboardingCompleted(): boolean {
  return storage.get<boolean>(ONBOARDING_KEY) || false;
}

/**
 * Mark onboarding tour as completed
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

/**
 * Check if welcome slides have been completed
 */
export function isWelcomeCompleted(): boolean {
  return storage.get<boolean>(WELCOME_KEY) || false;
}

/**
 * Mark welcome slides as completed
 */
export function completeWelcome(): void {
  storage.set(WELCOME_KEY, true);
}
