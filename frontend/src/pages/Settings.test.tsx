import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Settings } from './Settings';
import { AppProvider } from '@/context/AppContext';
import { NotificationProvider } from '@/context/NotificationContext';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

// AppProvider uses useAuth(); provide a mock user so it renders
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@test.com', name: 'Test', role: 'user' as const },
    authLoading: false,
  }),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock storage
vi.mock('@/lib/storage', () => ({
  storage: {
    get: vi.fn(() => []),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
  STORAGE_KEYS: {
    TRANSACTIONS: 'beme_transactions',
    WORKOUTS: 'beme_workouts',
    SETTINGS: 'beme_settings',
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </AppProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings page with title', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByRole('heading', { name: /date format/i })).toBeInTheDocument();
  });

  it('displays date format section', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByRole('heading', { name: /date format/i })).toBeInTheDocument();
  });

  it('displays units section', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByRole('heading', { name: /^units$/i })).toBeInTheDocument();
  });

  it('displays theme section', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument();
  });

  it('displays notifications section', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('displays data management section', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByRole('heading', { name: /data management/i })).toBeInTheDocument();
  });

  it('displays export data button', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByRole('button', { name: /export all data/i })).toBeInTheDocument();
  });

  it('displays reset settings button', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByRole('button', { name: /reset settings to defaults/i })).toBeInTheDocument();
  });

  it('displays clear all data button', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByRole('button', { name: /clear all data/i })).toBeInTheDocument();
  });

  it('opens confirmation dialog when clear data is clicked', async () => {
    const user = userEvent.setup();
    render(<Settings />, { wrapper });

    const clearButton = screen.getByRole('button', { name: /clear all data/i });
    await act(async () => {
      await user.click(clearButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to delete all your data/i)).toBeInTheDocument();
    });
  });

  it('opens confirmation dialog when reset settings is clicked', async () => {
    const user = userEvent.setup();
    render(<Settings />, { wrapper });

    const resetButton = screen.getByRole('button', { name: /reset settings to defaults/i });
    await act(async () => {
      await user.click(resetButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to reset all settings/i)).toBeInTheDocument();
    });
  });
});
