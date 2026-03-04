import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { TopBar } from './TopBar';

const mockLogout = vi.fn();

vi.mock('@/components/ui/sidebar', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/components/ui/sidebar')>();
  return {
    ...mod,
    SidebarTrigger: () => <span data-testid="sidebar-trigger" />,
  };
});

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'user' as const },
    settings: { currency: 'USD', dateFormat: 'MM/dd/yyyy', balanceDisplayLayout: 'compact' as const },
    updateSettings: vi.fn(),
  }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: { currency: 'USD', dateFormat: 'MM/dd/yyyy', balanceDisplayLayout: 'compact' as const },
    updateSettings: vi.fn(),
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('TopBar', () => {
  it('renders user menu trigger', () => {
    render(<TopBar />, { wrapper });
    expect(screen.getByRole('button', { name: /open user menu/i })).toBeInTheDocument();
  });

  it('clicking Sign out in user menu calls logout', async () => {
    const user = userEvent.setup();
    render(<TopBar />, { wrapper });

    await user.click(screen.getByRole('button', { name: /open user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }));

    expect(mockLogout).toHaveBeenCalled();
  });
});
