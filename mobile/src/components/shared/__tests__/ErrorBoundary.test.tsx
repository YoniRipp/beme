import React from 'react';
import { Text as RNText } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';

/**
 * A render-time throw unmounts the whole React Native root: the app does not crash to the home
 * screen, it goes blank and stays blank with nothing to tap. To a user, and to an App Store
 * reviewer, that is indistinguishable from a broken app. The web has had
 * `LocalErrorBoundary.tsx` for this; this client had nothing.
 *
 * **Rendered with no providers at all, and that is the point.** In `App.tsx` this sits above
 * `ThemeProvider` so it can catch a throw from the providers themselves, which means its
 * fallback must not read the theme. The first version rendered `components/ui`'s `Button` and
 * this test caught it: `useThemeContext must be used within ThemeProvider`, thrown by the
 * fallback — a blank screen again, with an extra step. Wrapping this in a `PaperProvider`
 * would hide exactly the failure worth catching.
 *
 * `componentDidCatch` logs, so React's own error output is silenced — otherwise a passing run
 * prints stack traces and the next person assumes something failed.
 */
function Boom({ explode }: { explode: boolean }): React.ReactElement {
  if (explode) throw new Error('kaboom');
  return <RNText>recovered</RNText>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the message instead of a blank screen, with no theme provider above it', async () => {
    const { getByText } = await render(
      <ErrorBoundary>
        <Boom explode />
      </ErrorBoundary>,
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('kaboom')).toBeTruthy();
  });

  it('renders children untouched when nothing throws', async () => {
    const { getByText, queryByText } = await render(
      <ErrorBoundary>
        <Boom explode={false} />
      </ErrorBoundary>,
    );

    expect(getByText('recovered')).toBeTruthy();
    expect(queryByText('Something went wrong')).toBeNull();
  });

  /**
   * "Try again" resets state and remounts the subtree, which recovers a transient failure.
   *
   * The flag lives outside the component on purpose: React state is lost when the subtree
   * remounts, and a `useEffect` never runs on a render that throws — so a child that tried to
   * un-explode either way would throw again forever and the test would be asserting the
   * opposite of what it says.
   */
  it('recovers the subtree when the cause has gone away', async () => {
    let shouldExplode = true;
    const Flaky = () => <Boom explode={shouldExplode} />;

    const { getByText } = await render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );

    expect(getByText('Something went wrong')).toBeTruthy();

    shouldExplode = false;
    fireEvent.press(getByText('Try again'));

    // `waitFor`, not a bare assertion: resetting the boundary's state remounts the subtree,
    // and RNTL 14 flushes that on its own schedule.
    await waitFor(() => expect(getByText('recovered')).toBeTruthy());
  });

  it('keeps showing the error when the cause has not', async () => {
    const { getByText } = await render(
      <ErrorBoundary>
        <Boom explode />
      </ErrorBoundary>,
    );

    fireEvent.press(getByText('Try again'));

    expect(getByText('Something went wrong')).toBeTruthy();
  });
});
