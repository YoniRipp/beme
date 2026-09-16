/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Base44Layout } from './Base44Layout';

const mockUser = vi.fn();
const mockHasAiAccess = vi.fn<[], boolean>(() => false);

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({ user: mockUser() }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

// `hasAiAccess` is `isPro || aiCallsRemaining > 0`, and every free account starts the month
// with a quota — so the AI Coach affordance is on screen for very nearly everyone. It was
// pinned to `false` here for the whole life of the overlap bug, which is why no unit test
// ever rendered the button.
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ hasAiAccess: mockHasAiAccess() }),
}));

vi.mock('../insights/AiChatPanel', () => ({
  AiChatPanel: ({ open }: { open: boolean }) => (open ? <div>AI Coach panel</div> : null),
}));

vi.mock('../voice/VoiceAgentPanel', () => ({
  VoiceAgentPanel: () => null,
}));

function renderLayout(initialPath = '/') {
  render(
    <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Base44Layout />}>
          <Route path="/" element={<div>Home content</div>} />
          <Route path="/energy" element={<div>Food content</div>} />
          <Route path="/insights" element={<div>Insights content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('Base44Layout navigation', () => {
  beforeEach(() => {
    mockUser.mockReturnValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      subscriptionStatus: 'free',
    });
  });

  it('renders the four bottom tabs: Home, Workouts, Food, Profile', () => {
    renderLayout();

    const bar = screen.getByRole('navigation', { name: /main navigation/i });
    const tabs = within(bar).getAllByRole('link').map((a) => a.textContent);
    expect(tabs).toEqual(['Home', 'Workouts', 'Food', 'Profile']);
  });

  it('points the Profile tab at settings and the Food tab at the energy route', () => {
    renderLayout();

    const bar = screen.getByRole('navigation', { name: /main navigation/i });
    expect(within(bar).getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/settings');
    expect(within(bar).getByRole('link', { name: 'Food' })).toHaveAttribute('href', '/energy');
  });

  // Goals left the tab bar, not the app.
  it('keeps Goals in the sidebar while leaving it out of the bottom bar', () => {
    renderLayout();

    const bar = screen.getByRole('navigation', { name: /main navigation/i });
    expect(within(bar).queryByRole('link', { name: 'Goals' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Goals' })).toHaveAttribute('href', '/goals');
  });

  it('shows no Clients entry for anyone, admins included', () => {
    mockUser.mockReturnValue({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
      subscriptionStatus: 'free',
    });

    renderLayout();

    expect(screen.queryByText('Clients')).not.toBeInTheDocument();
  });
});

describe('Base44Layout scroll position', () => {
  beforeEach(() => {
    mockUser.mockReturnValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      subscriptionStatus: 'free',
    });
  });

  // The shell is the only thing that sees every tab switch, so the reset lives here rather
  // than in the pages. Without it a tab opens at the previous tab's offset.
  it('sends the document back to the top when a tab is tapped', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const user = userEvent.setup();
    renderLayout();

    const bar = screen.getByRole('navigation', { name: /main navigation/i });
    await user.click(within(bar).getByRole('link', { name: 'Food' }));

    expect(await screen.findByText('Food content')).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });

    scrollTo.mockRestore();
  });
});

describe('Base44Layout sidebar drawer', () => {
  beforeEach(() => {
    mockUser.mockReturnValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      subscriptionStatus: 'free',
    });
  });

  // Below `lg` the sidebar is translated off-screen but stays in the DOM. Without `inert`
  // its links remain in the tab order, so a keyboard or switch user lands on controls
  // they cannot see.
  it('takes the closed drawer out of the tab order', async () => {
    renderLayout();
    const sidebar = document.querySelector('aside');
    expect(sidebar).not.toBeNull();
    await waitFor(() => expect(sidebar).toHaveAttribute('inert'));
  });

  it('puts the drawer back in the tab order once opened', async () => {
    const user = userEvent.setup();
    renderLayout();
    const sidebar = document.querySelector('aside')!;
    await waitFor(() => expect(sidebar).toHaveAttribute('inert'));

    await user.click(screen.getByRole('button', { name: /toggle menu/i }));

    await waitFor(() => expect(sidebar).not.toHaveAttribute('inert'));
  });

  it('closes the drawer on Escape', async () => {
    const user = userEvent.setup();
    renderLayout();
    const sidebar = document.querySelector('aside')!;

    await user.click(screen.getByRole('button', { name: /toggle menu/i }));
    await waitFor(() => expect(sidebar).not.toHaveAttribute('inert'));

    await user.keyboard('{Escape}');

    await waitFor(() => expect(sidebar).toHaveAttribute('inert'));
  });
});

/**
 * The AI Coach affordance.
 *
 * Two renderings of one condition: below `lg` the bottom bar docks it (so it inherits the
 * bar's edge, the bar's insets and the strip `<main>` reserves), above `lg` the fixed FAB
 * shows it stacked over the desktop voice button. Both sit in the DOM at once and CSS picks
 * one — the same arrangement the mic has always had.
 */
describe('Base44Layout AI Coach', () => {
  beforeEach(() => {
    mockUser.mockReturnValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      subscriptionStatus: 'free',
    });
    mockHasAiAccess.mockReturnValue(true);
  });

  afterEach(() => {
    mockHasAiAccess.mockReturnValue(false);
  });

  it('docks the button inside the bottom bar rather than floating it over the page', () => {
    renderLayout();

    const bar = screen.getByRole('navigation', { name: /main navigation/i });
    const docked = within(bar).getByRole('button', { name: 'Open AI Coach' });

    // The whole fix: it is a child of the bar, so it cannot land anywhere the bar is not.
    expect(bar).toContainElement(docked);
    // Not `position: fixed` against the viewport any more, and no literal offset.
    expect(docked.className).not.toContain('fixed');
    expect(docked.className).not.toContain('9.75rem');
    // Offset from the pill's own height, and right-aligned to the pill's edge.
    expect(docked.className).toContain('bottom-[calc(100%+var(--dock-gap))]');
    expect(docked.className).toContain('right-0');
    expect(docked).not.toHaveAttribute('style');
  });

  it('keeps the desktop FAB as the ≥lg rendering, stacked above the voice button', () => {
    renderLayout();

    const bar = screen.getByRole('navigation', { name: /main navigation/i });
    const all = screen.getAllByRole('button', { name: 'Open AI Coach' });
    const desktop = all.filter((el) => !bar.contains(el));

    expect(all).toHaveLength(2);
    expect(desktop).toHaveLength(1);
    expect(desktop[0].className).toContain('hidden');
    expect(desktop[0].className).toContain('lg:flex');
    // The pair that was already correct: voice FAB at `lg:bottom-6`, AI 12px above it.
    expect(desktop[0].className).toContain('lg:bottom-[5.25rem]');
  });

  it('opens the AI Coach panel from the docked button', async () => {
    const user = userEvent.setup();
    renderLayout();

    const bar = screen.getByRole('navigation', { name: /main navigation/i });
    expect(screen.queryByText('AI Coach panel')).not.toBeInTheDocument();

    await user.click(within(bar).getByRole('button', { name: 'Open AI Coach' }));

    expect(await screen.findByText('AI Coach panel')).toBeInTheDocument();
  });

  it('renders nothing on /insights, which has the coach inline', () => {
    renderLayout('/insights');

    expect(screen.queryAllByRole('button', { name: 'Open AI Coach' })).toEqual([]);
  });

  it('renders nothing without AI access, and leaves the bar untouched', () => {
    mockHasAiAccess.mockReturnValue(false);
    renderLayout();

    expect(screen.queryAllByRole('button', { name: 'Open AI Coach' })).toEqual([]);

    const bar = screen.getByRole('navigation', { name: /main navigation/i });
    expect(within(bar).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Home',
      'Workouts',
      'Food',
      'Profile',
    ]);
    expect(within(bar).getByRole('button', { name: 'Open voice' })).toBeInTheDocument();
  });

  // The reservation and the chrome are one number now. A literal here is what let the FAB
  // stand 28px clear of the strip that was supposed to contain it.
  it('reserves the chrome strip in <main> from the shared variable, inset included', () => {
    renderLayout();

    const main = document.querySelector('main');
    expect(main).not.toBeNull();
    expect(main!.className).toContain('pb-[calc(var(--bottom-chrome)+var(--safe-bottom))]');
    expect(main!.className).not.toContain('pb-32');
  });
});
