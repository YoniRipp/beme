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

vi.mock('@/features/body/api', () => ({
  workoutsApi: { list: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/features/energy/api', () => ({
  foodEntriesApi: { list: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn(), delete: vi.fn() },
  dailyCheckInsApi: { list: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn(), delete: vi.fn() },
  searchFoods: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/features/goals/api', () => ({
  goalsApi: { list: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/core/api/groups', () => ({
  groupsApi: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn(), delete: vi.fn(), invite: vi.fn(), cancelInvite: vi.fn(), acceptInvite: vi.fn(), removeMember: vi.fn() },
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
