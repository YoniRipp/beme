import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Money } from './Money';
import { TransactionProvider } from '@/context/TransactionContext';
import { GroupProvider } from '@/context/GroupContext';
import { AppProvider } from '@/context/AppContext';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'a@b.com', name: 'Test', role: 'user' as const },
    authLoading: false,
  }),
}));
vi.mock('@/features/money/api', () => ({
  transactionsApi: { list: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/core/api/groups', () => ({
  groupsApi: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn(), delete: vi.fn(), invite: vi.fn(), cancelInvite: vi.fn(), acceptInvite: vi.fn(), removeMember: vi.fn() },
}));

// Mock the MonthlyChart component
vi.mock('@/features/money/components/MonthlyChart', () => ({
  MonthlyChart: () => <div data-testid="monthly-chart">Chart</div>,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <GroupProvider>
          <TransactionProvider>
            {children}
          </TransactionProvider>
        </GroupProvider>
      </AppProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

describe('Money Page', () => {
  it('renders money page with transactions', () => {
    render(<Money />, { wrapper });
    expect(screen.getByText(/balance/i)).toBeInTheDocument();
  });

  it('filters transactions by type', async () => {
    const user = userEvent.setup();
    render(<Money />, { wrapper });
    
    const incomeTab = screen.getByRole('tab', { name: /income/i });
    await user.click(incomeTab);
    
    // Should show income transactions
    await waitFor(() => {
      expect(incomeTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
