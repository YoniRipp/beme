import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UpgradePrompt } from './UpgradePrompt';

const { mockSubscribe } = vi.hoisted(() => ({ mockSubscribe: vi.fn() }));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ subscribe: mockSubscribe, isPro: false, aiCallsRemaining: 0 }),
}));

const wrap = (ui: React.ReactNode) => render(<BrowserRouter>{ui}</BrowserRouter>);

describe('UpgradePrompt — exhausted allowance', () => {
  /**
   * The only branch production reaches, now that the AI cap is enforced. TrackVibe is free
   * and has no payment provider, so `subscribe()` would call createCheckout, fail, and toast
   * "Could not start checkout" — a dead end dressed as a purchase.
   */
  it('offers nothing to buy', () => {
    wrap(<UpgradePrompt feature="AI Insights" quotaExhausted />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/upgrade/i)).toBeNull();
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it('says when the allowance comes back', () => {
    wrap(<UpgradePrompt feature="AI Insights" quotaExhausted />);

    expect(screen.getByText(/resets at the start of next month/i)).toBeInTheDocument();
  });
});
