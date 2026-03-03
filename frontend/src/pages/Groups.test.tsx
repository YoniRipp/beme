import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Groups } from './Groups';
import { GroupProvider } from '@/context/GroupContext';
import { AppProvider } from '@/context/AppContext';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'a@b.com', name: 'Test', role: 'user' as const },
    authLoading: false,
  }),
}));
vi.mock('@/core/api/groups', () => ({
  groupsApi: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn(), delete: vi.fn(), invite: vi.fn(), cancelInvite: vi.fn(), acceptInvite: vi.fn(), removeMember: vi.fn() },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <GroupProvider>
          {children}
        </GroupProvider>
      </AppProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

describe('Groups Page', () => {
  it('renders groups page with title', () => {
    render(<Groups />, { wrapper });
    expect(screen.getByText(/new group/i)).toBeInTheDocument();
  });

  it('displays new group button', () => {
    render(<Groups />, { wrapper });
    expect(screen.getByText(/new group/i)).toBeInTheDocument();
  });

  it('opens create group modal when new group button is clicked', async () => {
    const user = userEvent.setup();
    render(<Groups />, { wrapper });
    
    const newGroupButton = screen.getByText(/new group/i);
    await user.click(newGroupButton);
    
    await waitFor(() => {
      expect(screen.getByText(/create group/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no groups exist', () => {
    render(<Groups />, { wrapper });
    expect(screen.getByText(/you don't have any groups yet/i)).toBeInTheDocument();
  });

  it('opens create group modal from empty state', async () => {
    const user = userEvent.setup();
    render(<Groups />, { wrapper });

    const createButton = screen.getByRole('button', { name: /create your first group/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create new group/i })).toBeInTheDocument();
    });
  });
});
