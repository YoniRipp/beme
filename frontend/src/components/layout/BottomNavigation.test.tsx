import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home, Flame, Dumbbell, Settings } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';

const items = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Energy', path: '/energy', icon: Flame },
  { name: 'Body', path: '/body', icon: Dumbbell },
  { name: 'Settings', path: '/settings', icon: Settings },
];

function renderNav(currentPath = '/', onCenterPress = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[currentPath]}>
      <BottomNavigation items={items} currentPath={currentPath} onCenterPress={onCenterPress} />
    </MemoryRouter>
  );
  return onCenterPress;
}

function renderNavWithCoach(showAiCoach: boolean, onAiCoachPress = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/']}>
      <BottomNavigation
        items={items}
        currentPath="/"
        onCenterPress={vi.fn()}
        showAiCoach={showAiCoach}
        onAiCoachPress={onAiCoachPress}
      />
    </MemoryRouter>
  );
  return onAiCoachPress;
}

describe('BottomNavigation', () => {
  it('renders all nav items split around the center voice button', () => {
    renderNav();
    for (const item of items) {
      expect(screen.getByRole('link', { name: item.name })).toHaveAttribute('href', item.path);
    }
    expect(screen.getByRole('button', { name: 'Open voice' })).toBeInTheDocument();
  });

  it('marks the active item with aria-current', () => {
    renderNav('/body');
    expect(screen.getByRole('link', { name: 'Body' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  // What this can prove is that the styling goes through utility classes rather than an
  // inline `style` attribute, which is the `frontend/mobile-ui` rule. It cannot prove the
  // safe area is honoured: jsdom has no layout engine and no `env()`, so it stayed green
  // through the entire life of the bug where the insets were inert. The behaviour is
  // covered by `e2e/safe-area.spec.ts`.
  it('declares its safe-area and FAB shadow as classes, not as inline styles', () => {
    renderNav();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav.className).toContain('pb-safe');
    expect(nav.className).toContain('px-safe');
    expect(nav).not.toHaveAttribute('style');

    const voiceButton = screen.getByRole('button', { name: 'Open voice' });
    expect(voiceButton.className).toContain('shadow-fab');
    expect(voiceButton).not.toHaveAttribute('style');
  });

  it('fires onCenterPress when the voice button is tapped', () => {
    const onCenterPress = renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Open voice' }));
    expect(onCenterPress).toHaveBeenCalledTimes(1);
  });
});

/**
 * The docked AI Coach button. The bar renders an affordance and nothing more — whether the
 * user has AI access, and what pressing it does, both stay in `Base44Layout`.
 */
describe('BottomNavigation AI Coach dock', () => {
  it('renders the docked button when asked, without disturbing the tabs or the mic', () => {
    renderNavWithCoach(true);

    expect(screen.getByRole('button', { name: 'Open AI Coach' })).toBeInTheDocument();
    for (const item of items) {
      expect(screen.getByRole('link', { name: item.name })).toHaveAttribute('href', item.path);
    }
    expect(screen.getByRole('button', { name: 'Open voice' })).toBeInTheDocument();
  });

  it('renders nothing when not asked, and the bar is unchanged', () => {
    renderNavWithCoach(false);

    expect(screen.queryByRole('button', { name: 'Open AI Coach' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(items.length);
    expect(screen.getByRole('button', { name: 'Open voice' })).toBeInTheDocument();
  });

  it('defaults to hidden, so no caller gets the button by accident', () => {
    renderNav();
    expect(screen.queryByRole('button', { name: 'Open AI Coach' })).not.toBeInTheDocument();
  });

  it('fires onAiCoachPress when tapped', () => {
    const onAiCoachPress = renderNavWithCoach(true);
    fireEvent.click(screen.getByRole('button', { name: 'Open AI Coach' }));
    expect(onAiCoachPress).toHaveBeenCalledTimes(1);
  });

  /**
   * jsdom has no layout engine, so this cannot measure the dock. What it can prove is that
   * the dock is a child of the pill and offsets from the pill's own height — the property
   * that makes the geometry follow the bar instead of drifting from it. The measurement is
   * `e2e/ai-fab-overlap.spec.ts`.
   */
  it('positions the dock from the pill, sharing the pill edge', () => {
    renderNavWithCoach(true);

    const pill = screen.getByRole('button', { name: 'Open voice' }).parentElement!;
    const dock = screen.getByRole('button', { name: 'Open AI Coach' });

    expect(pill).toContainElement(dock);
    expect(dock.className).toContain('bottom-[calc(100%+var(--dock-gap))]');
    expect(dock.className).toContain('right-0');
    expect(dock.className).toContain('h-[var(--dock-size)]');
    expect(dock.className).toContain('w-[var(--dock-size)]');
    expect(dock).not.toHaveAttribute('style');
  });

  // Both floating controls punch out of the same scrim, so both carry the bar's ring; the
  // mic keeps the primary glow because it is the primary action, the dock takes the bar's
  // own elevation step because it is bar chrome.
  it('lights the mic and the dock deliberately, from the shadow scale', () => {
    renderNavWithCoach(true);

    const mic = screen.getByRole('button', { name: 'Open voice' });
    const dock = screen.getByRole('button', { name: 'Open AI Coach' });

    expect(mic.className).toContain('shadow-fab');
    expect(dock.className).toContain('shadow-card-lg');
    expect(dock.className).toContain('ring-background');
    expect(dock.className).toContain('rounded-full');
  });

  it('sizes the scrim from the shared chrome variable, inset included', () => {
    renderNavWithCoach(true);

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const scrim = nav.firstElementChild as HTMLElement;

    expect(scrim.className).toContain('h-[calc(var(--bottom-chrome)+var(--safe-bottom))]');
    expect(scrim.className).not.toContain('h-32');
  });
});
