import { describe, it, expect, vi } from 'vitest';
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
  it('renders energy page', async () => {
    render(<Energy />, { wrapper });
    await waitFor(() => {
      expect(screen.getAllByText(/daily/i).length).toBeGreaterThan(0);
    });
  });

  it('shows calorie progress section', async () => {
    render(<Energy />, { wrapper });
    await waitFor(() => {
      expect(screen.getAllByText(/of 2400 kcal/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/protein/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/carbs/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/^fat$/i).length).toBeGreaterThan(0);
    });
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
