import React from 'react';
import { render, cleanup } from '@testing-library/react-native';
import { TruncationNotice } from '../TruncationNotice';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { SettingsProvider } from '../../../context/SettingsContext';
import { PAGE_LIMIT, MAX_PAGES } from '@trackvibe/shared/api';

// `await render(...)`: RNTL 14 made render async. `afterEach(cleanup)` because each case
// mounts its own SettingsProvider, whose AsyncStorage read is still in flight otherwise —
// the shape that passes alone and fails in sequence, and gets mislabelled a flake.
const renderNotice = (truncated: boolean) =>
  render(
    <SettingsProvider>
      <ThemeProvider>
        <TruncationNotice truncated={truncated} />
      </ThemeProvider>
    </SettingsProvider>,
  );

describe('TruncationNotice', () => {
  afterEach(cleanup);

  it('says nothing when the history is complete', async () => {
    const { queryByText } = await renderNotice(false);

    expect(queryByText(/most recent/i)).toBeNull();
  });

  it('tells the user their history is clipped, and at what number', async () => {
    const { getByText } = await renderNotice(true);

    // Derived from the pager's own bounds, so the copy cannot drift from the real limit.
    const expected = (PAGE_LIMIT * MAX_PAGES).toLocaleString();
    expect(getByText(new RegExp(`most recent ${expected} entries`, 'i'))).toBeTruthy();
  });

  /**
   * Truncation is not a failure. `ErrorNotice` uses accessibilityRole="alert" so VoiceOver
   * interrupts to announce it; doing the same here would tell a user something is broken when
   * every row on screen is correct.
   */
  it('is not announced as an alert', async () => {
    const { getByText } = await renderNotice(true);

    const node = getByText(/most recent/i);
    expect(node.props.accessibilityRole).not.toBe('alert');
  });
});
