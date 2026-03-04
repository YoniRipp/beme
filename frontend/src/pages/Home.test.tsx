/// <reference types="@testing-library/jest-dom" />
import React, { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home } from './Home';
import { AppProvider } from '../context/AppContext';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'a@b.com', name: 'Test', role: 'user' as const },
    authLoading: false,
  }),
}));

vi.mock('@/hooks/useWorkouts', () => ({
  useWorkouts: () => ({
    workouts: [],
    workoutsLoading: false,
    workoutsError: null,
    refetchWorkouts: vi.fn(),
    addWorkout: vi.fn(),
    updateWorkout: vi.fn(),
    deleteWorkout: vi.fn(),
    getWorkoutById: vi.fn(),
  }),
}));

vi.mock('@/hooks/useEnergy', () => ({
  useEnergy: () => ({
    foodEntries: [],
    checkIns: [],
    energyLoading: false,
    foodError: null,
    checkInsError: null,
    addFoodEntry: vi.fn(),
    updateFoodEntry: vi.fn(),
    deleteFoodEntry: vi.fn(),
    addCheckIn: vi.fn(),
    updateCheckIn: vi.fn(),
    deleteCheckIn: vi.fn(),
    getCheckInByDate: vi.fn(() => undefined),
    refetchEnergy: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGoals', () => ({
  useGoals: () => ({
    goals: [],
    goalsLoading: false,
    goalsError: null,
    addGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
    refetchGoals: vi.fn(),
  }),
}));
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        {children}
      </AppProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

describe('Home Page', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('renders home page with progress cards', () => {
    render(<Home />, { wrapper });
    expect(screen.getByText(/workouts/i)).toBeInTheDocument();
  });

it('displays dashboard stats section', () => {
    render(<Home />, { wrapper });
    expect(screen.getByText(/workouts/i)).toBeInTheDocument();
  });

  it('displays calories and avg sleep in progress cards', () => {
    render(<Home />, { wrapper });
    expect(screen.getByText(/calories/i)).toBeInTheDocument();
    expect(screen.getByText(/avg sleep/i)).toBeInTheDocument();
  });

  it('displays goals section', () => {
    render(<Home />, { wrapper });
    expect(screen.getByText(/^goals$/i)).toBeInTheDocument();
  });

it('opens goal modal when a progress card without a goal is clicked', async () => {
    const user = userEvent.setup();
    render(<Home />, { wrapper });

    await waitFor(() => {
      expect(screen.getAllByText(/tap to set goal/i).length).toBeGreaterThanOrEqual(1);
    });
    const tapToSetGoal = screen.getAllByText(/tap to set goal/i)[0];
    // Click the card (parent element with role="button")
    const card = tapToSetGoal.closest('[role="button"]')!;
    await user.click(card);

    await waitFor(() => {
      const createGoalElements = screen.getAllByText(/create goal/i);
      expect(createGoalElements.length).toBeGreaterThanOrEqual(1);
    });
  });

it('shows tap to set goal when no goals exist', async () => {
    render(<Home />, { wrapper });
    await waitFor(() => {
      expect(screen.getAllByText(/tap to set goal/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
