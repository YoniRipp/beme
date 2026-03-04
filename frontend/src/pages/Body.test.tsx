import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { format, subWeeks } from 'date-fns';
import { Body } from './Body';
import { AppProvider } from '@/context/AppContext';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@test.com', name: 'Test', role: 'user' as const },
    authLoading: false,
  }),
}));

const { mockUseWorkouts } = vi.hoisted(() => ({
  mockUseWorkouts: vi.fn(),
}));

vi.mock('@/hooks/useWorkouts', () => ({
  useWorkouts: mockUseWorkouts,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        {children}
      </AppProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

describe('Body Page', () => {
  const defaultHookReturn = {
    workouts: [],
    workoutsLoading: false,
    workoutsError: null,
    refetchWorkouts: vi.fn(),
    addWorkout: vi.fn(),
    updateWorkout: vi.fn(),
    deleteWorkout: vi.fn(),
    getWorkoutById: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkouts.mockReturnValue(defaultHookReturn);
  });

  it('renders body page', () => {
    render(<Body />, { wrapper });
    expect(screen.getByRole('heading', { name: /workouts/i })).toBeInTheDocument();
  });

  it('shows workouts section', () => {
    render(<Body />, { wrapper });
    expect(screen.getByRole('heading', { name: /workouts/i })).toBeInTheDocument();
  });

  it('shows This week and Older sections when workouts span both', async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const twoWeeksAgo = format(subWeeks(new Date(), 2), 'yyyy-MM-dd');
    mockUseWorkouts.mockReturnValue({
      ...defaultHookReturn,
      workouts: [
        {
          id: '1',
          date: new Date(today),
          title: 'This Week Workout',
          type: 'strength',
          durationMinutes: 45,
          exercises: [{ name: 'Squat', sets: 3, reps: 10, weight: 100 }],
        },
        {
          id: '2',
          date: new Date(twoWeeksAgo),
          title: 'Older Workout',
          type: 'strength',
          durationMinutes: 30,
          exercises: [{ name: 'Bench', sets: 3, reps: 8 }],
        },
      ],
    });

    render(<Body />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('This week')).toBeInTheDocument();
    });
    expect(screen.getByText('Older')).toBeInTheDocument();
    expect(screen.getByText('This Week Workout')).toBeInTheDocument();
    expect(screen.getByText('Older Workout')).toBeInTheDocument();
  });
});
