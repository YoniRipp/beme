import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Energy } from './Energy';
import { AppProvider } from '@/context/AppContext';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'a@b.com', name: 'Test', role: 'user' as const },
    authLoading: false,
  }),
}));
vi.mock('@/features/energy/api', () => ({
  foodEntriesApi: { list: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn(), delete: vi.fn() },
  dailyCheckInsApi: { list: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn(), delete: vi.fn() },
  searchFoods: vi.fn().mockResolvedValue([]),
}));

// The calorie ring reads the goals table now, not a kcal figure derived from the profile's
// macro grams. This test used to assert "of 2400 kcal" — which was the web's *default*
// macro sum, a number no user had set, and 400 kcal away from what the Expo client showed
// for the same account.
const mockGoals: { id: string; type: string; target: number; period: string; createdAt: string }[] = [];
vi.mock('@/features/goals/api', () => ({
  goalsApi: {
    list: vi.fn(async () => ({ data: mockGoals, total: mockGoals.length, limit: 50, offset: 0 })),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
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

describe('Energy Page', () => {
  beforeEach(() => {
    queryClient.clear();
    mockGoals.length = 0;
  });

  it('renders energy page', async () => {
    render(<Energy />, { wrapper });
    await waitFor(() => {
      expect(screen.getAllByText(/daily/i).length).toBeGreaterThan(0);
    });
  });

  it('shows calorie progress against the daily calorie goal', async () => {
    mockGoals.push({ id: 'cal', type: 'calories', target: 2000, period: 'daily', createdAt: '2026-09-01' });
    render(<Energy />, { wrapper });
    await waitFor(() => {
      expect(screen.getAllByText(/of 2000 kcal/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/protein/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/carbs/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/^fat$/i).length).toBeGreaterThan(0);
    });
  });

  it('says there is no target rather than inventing one', async () => {
    render(<Energy />, { wrapper });
    await waitFor(() => {
      expect(screen.getAllByText(/no target/i).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/2400/)).not.toBeInTheDocument();
  });

  it('opens food modal when add food button is clicked', async () => {
    const user = userEvent.setup();
    render(<Energy />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Log breakfast')).toBeInTheDocument();
    });
    const addButton = screen.getAllByRole('button', { name: /^add$/i })[0];
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/add food entry/i)).toBeInTheDocument();
    });
  });
});
