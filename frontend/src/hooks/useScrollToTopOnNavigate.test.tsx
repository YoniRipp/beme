/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useScrollToTopOnNavigate } from './useScrollToTopOnNavigate';

/**
 * Stands in for a shell: calls the hook once, above the routes it wraps.
 *
 * Navigation is driven through real `<Link>`s and a real `navigate(-1)` rather than by
 * mocking `useNavigationType`, so these tests cover the wiring and not the mock.
 */
function ScrollHarness() {
  useScrollToTopOnNavigate();
  const navigate = useNavigate();

  return (
    <div>
      <Link to="/energy">Go to Food</Link>
      <Link to="/energy?range=week">Change the search string</Link>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
      <Routes>
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/energy" element={<p>Food page</p>} />
      </Routes>
    </div>
  );
}

function renderHarness() {
  render(
    <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollHarness />
    </MemoryRouter>
  );
}

describe('useScrollToTopOnNavigate', () => {
  let scrollTo: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrolls the document to the top when the pathname changes', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('link', { name: 'Go to Food' }));

    expect(await screen.findByText('Food page')).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  // `index.css` sets `html { scroll-behavior: smooth }`, which every default form of the call
  // inherits. Dropping `'instant'` would leave the hook animating a scroll up through the
  // incoming page — still "working", and worse than the bug. Nothing else would catch it.
  it("passes behavior 'instant' so the global smooth scroll-behavior cannot animate the reset", async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('link', { name: 'Go to Food' }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  // Back and forward are first-class controls in the PWA; `history.scrollRestoration` already
  // returns the user to where they were, and on async-height pages it does it better than we
  // could. The initial render is a POP too, so a reload keeps its restored offset.
  it('leaves POP navigations to the browser, including the first render', async () => {
    const user = userEvent.setup();
    renderHarness();

    expect(scrollTo).not.toHaveBeenCalled();

    await user.click(screen.getByRole('link', { name: 'Go to Food' }));
    expect(await screen.findByText('Food page')).toBeInTheDocument();
    scrollTo.mockClear();

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('ignores a search-string change on the same pathname', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('link', { name: 'Go to Food' }));
    expect(await screen.findByText('Food page')).toBeInTheDocument();
    scrollTo.mockClear();

    await user.click(screen.getByRole('link', { name: 'Change the search string' }));

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
