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
