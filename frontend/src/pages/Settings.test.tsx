import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Settings } from './Settings';
import { AppProvider } from '@/context/AppContext';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@test.com', name: 'Test', role: 'user' as const },
    authLoading: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock ALL settings sub-components to isolate the test
vi.mock('@/components/settings/SubscriptionSection', () => ({
  SubscriptionSection: () => <div>Subscription</div>,
}));
vi.mock('@/components/settings/AccountSection', () => ({
  AccountSection: () => <div>Account</div>,
}));
vi.mock('@/components/settings/ProfileSection', () => ({
  ProfileSection: () => <div>Profile</div>,
}));
vi.mock('@/components/settings/CycleSection', () => ({
  CycleSection: () => <div>Cycle</div>,
}));
vi.mock('@/components/settings/DateFormatSection', () => ({
  DateFormatSection: () => <div><h3>Date Format</h3></div>,
}));
vi.mock('@/components/settings/UnitsSection', () => ({
  UnitsSection: () => <div><h3>Units</h3></div>,
}));
vi.mock('@/components/settings/AppearanceSection', () => ({
  AppearanceSection: () => <div><h3>Appearance</h3></div>,
}));
vi.mock('@/components/settings/NotificationsSection', () => ({
  NotificationsSection: () => <div><h3>Notifications</h3></div>,
}));
vi.mock('@/components/settings/DataManagementSection', () => ({
  DataManagementSection: ({ onResetClick, onClearClick }: { onResetClick: () => void; onClearClick: () => void }) => (
    <div>
      <h3>Data Management</h3>
      <button onClick={() => { /* export */ }}>Export All Data</button>
      <button onClick={onResetClick}>Reset Settings to Defaults</button>
      <button onClick={onClearClick}>Clear All Data</button>
    </div>
  ),
}));
vi.mock('@/components/trainer/PendingInvitations', () => ({
  PendingInvitations: () => <div>Invitations</div>,
}));

vi.mock('@/lib/storage', () => ({
  storage: { get: vi.fn(() => null), set: vi.fn(), remove: vi.fn(), clear: vi.fn() },
  STORAGE_KEYS: { SETTINGS: 'beme_settings' },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        {children}
      </AppProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('renders settings page with title', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByText('Date Format')).toBeInTheDocument();
  });

  it('displays units section', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByText('Units')).toBeInTheDocument();
  });

  it('displays theme section', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('displays notifications section', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('displays data management section', () => {
    render(<Settings />, { wrapper });
    expect(screen.getByText('Data Management')).toBeInTheDocument();
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
