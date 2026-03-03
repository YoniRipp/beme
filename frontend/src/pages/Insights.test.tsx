import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Insights } from './Insights';
import { TransactionProvider } from '@/context/TransactionContext';
import { WorkoutProvider } from '@/context/WorkoutContext';
import { EnergyProvider } from '@/context/EnergyContext';
import { AppProvider } from '@/context/AppContext';

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
vi.mock('@/features/money/api', () => ({
  transactionsApi: { list: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/lib/exchangeRates', () => ({
  fetchRates: vi.fn().mockResolvedValue({ rates: {} }),
}));

// Mock recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  Bar: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TransactionProvider>
          <WorkoutProvider>
            <EnergyProvider>
              {children}
            </EnergyProvider>
          </WorkoutProvider>
        </TransactionProvider>
      </AppProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

describe('Insights Page', () => {
  it('renders insights page with title', () => {
    render(<Insights />, { wrapper });
    expect(screen.getByRole('heading', { name: /financial insights/i })).toBeInTheDocument();
  });

  it('displays financial insights section', () => {
    render(<Insights />, { wrapper });
    expect(screen.getByRole('heading', { name: /financial insights/i })).toBeInTheDocument();
  });

  it('displays fitness insights section', () => {
    render(<Insights />, { wrapper });
    expect(screen.getByRole('heading', { name: /fitness insights/i })).toBeInTheDocument();
  });

  it('displays health insights section', () => {
    render(<Insights />, { wrapper });
    expect(screen.getByRole('heading', { name: /health insights/i })).toBeInTheDocument();
  });

  it('displays spending trend', () => {
    render(<Insights />, { wrapper });
    expect(screen.getByRole('tab', { name: /spending trend/i })).toBeInTheDocument();
  });

  it('displays workout frequency', () => {
    render(<Insights />, { wrapper });
    const elements = screen.getAllByText(/workout frequency/i);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('displays calorie trend', () => {
    render(<Insights />, { wrapper });
    const elements = screen.getAllByText(/calorie trend/i);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });
});
