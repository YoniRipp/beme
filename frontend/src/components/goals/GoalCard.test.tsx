import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoalCard } from './GoalCard';
import { Goal } from '@/types/goals';
import { AppProvider } from '@/context/AppContext';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

// AppProvider uses useAuth(); provide a mock user
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'a@b.com', name: 'Test', role: 'user' as const },
    authLoading: false,
  }),
}));

// useGoalProgress: return 100% for achieved-goal so "displays checkmark" test passes
vi.mock('@/features/goals/useGoalProgress', () => ({
  useGoalProgress: (goalId: string) =>
    goalId === 'achieved-goal'
      ? { current: 2000, target: 2000, percentage: 100 }
      : { current: 0, target: 2000, percentage: 0 },
}));

// API mocks for React Query hooks
vi.mock('@/features/body/api', () => ({
  workoutsApi: {
    list: vi.fn().mockResolvedValue([]),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('@/features/energy/api', () => ({
  foodEntriesApi: { list: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn(), delete: vi.fn() },
  dailyCheckInsApi: { list: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn(), delete: vi.fn() },
  searchFoods: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/features/money/api', () => ({
  transactionsApi: {
    list: vi.fn().mockResolvedValue([]),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('@/features/goals/api', () => ({
  goalsApi: {
    list: vi.fn().mockResolvedValue([]),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGoal: Goal = {
  id: 'test-goal',
  type: 'calories',
  target: 2000,
  period: 'weekly',
  createdAt: new Date(),
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      {children}
    </AppProvider>
  </QueryClientProvider>
);

describe('GoalCard', () => {
  it('renders goal card with title', () => {
    render(<GoalCard goal={mockGoal} />, { wrapper });
    expect(screen.getByRole('heading', { name: /calories goal/i })).toBeInTheDocument();
  });

  it('displays goal progress', () => {
    render(<GoalCard goal={mockGoal} />, { wrapper });
    expect(screen.getByRole('heading', { name: /calories goal/i })).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/0\s*\/\s*2,?000/);
  });

  it('shows edit button when onEdit is provided', () => {
    const onEdit = vi.fn();
    render(<GoalCard goal={mockGoal} onEdit={onEdit} />, { wrapper });
    expect(screen.getByRole('button', { name: /edit goal/i })).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<GoalCard goal={mockGoal} onEdit={onEdit} />, { wrapper });

    const editButton = screen.getByRole('button', { name: /edit goal/i });
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockGoal);
  });

  it('opens delete confirmation dialog when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<GoalCard goal={mockGoal} />, { wrapper });
    const deleteButton = screen.getByRole('button', { name: /delete goal/i });
    await act(async () => {
      await user.click(deleteButton);
    });
    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to delete this goal/i)).toBeInTheDocument();
    });
  });

  it('displays checkmark when goal is achieved', () => {
    const achievedGoal: Goal = {
      ...mockGoal,
      id: 'achieved-goal',
    };
    render(<GoalCard goal={achievedGoal} />, { wrapper });
    expect(screen.getByRole('heading', { name: /calories goal/i })).toBeInTheDocument();
    expect(screen.getByText(/100% complete/i)).toBeInTheDocument();
  });
});
