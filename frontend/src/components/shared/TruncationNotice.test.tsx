import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TruncationNotice } from './TruncationNotice';
import { PAGE_LIMIT, MAX_PAGES } from '@trackvibe/shared/api';

describe('TruncationNotice', () => {
  it('says nothing when the history is complete', () => {
    render(<TruncationNotice truncated={false} />);

    expect(screen.queryByTestId('truncation-notice')).toBeNull();
  });

  it('tells the user their history is clipped, and at what number', () => {
    render(<TruncationNotice truncated />);

    // Derived from the pager's own bounds, so the copy cannot drift from the real limit.
    const expected = (PAGE_LIMIT * MAX_PAGES).toLocaleString();
    expect(screen.getByTestId('truncation-notice')).toHaveTextContent(
      new RegExp(`most recent ${expected} entries`, 'i'),
    );
  });

  /**
   * Truncation is not a failure. The error path renders in `text-destructive`; using it here
   * would report a fault when every row on screen is correct.
   */
  it('does not present itself as an error', () => {
    render(<TruncationNotice truncated />);

    const notice = screen.getByTestId('truncation-notice');
    expect(notice.className).not.toContain('destructive');
    expect(notice.getAttribute('role')).not.toBe('alert');
  });
});
