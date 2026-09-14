import { test, expect } from '@playwright/test';
import { signIn } from './support/session';

/**
 * The authenticated shell.
 *
 * Auth is bootstrapped from `POST /api/auth/refresh` (`src/context/AuthContext.tsx`), so
 * signing in is a matter of answering that one call — see `e2e/support/session.ts`.
 *
 * These tests were skipped for months on the wrong diagnosis. This header used to claim the
 * app bootstraps from `GET /api/auth/me`, and the comment on the skip concluded that route
 * interception could not get past the auth gate at all. Neither was true: the spec stubbed an
 * endpoint the app never calls at startup, and it routed on a double-star glob around
 * `/api/`, which also matches Vite's own module URLs for `src/core/api/client.ts` — so the
 * interceptor answered application source with JSON and the page could not boot. Matching on
 * the pathname and answering `/auth/refresh` is enough; no backend, no seeded user.
 *
 * The list endpoints are stubbed empty so pages render their loaded state rather than
 * hanging on a backend that is not running. That means these tests cover the shell —
 * routing, navigation, page titles, empty states — and not data rendering.
 */

test.describe('Authenticated shell', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('lands on the dashboard rather than the login page', async ({ page }) => {
    await page.goto('/');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /hey /i })).toBeVisible();
  });

  /**
   * Each route's own `h1`, from the `PageHeader` the page renders — not a word from the
   * chrome. The original table matched on free text, and three of its five entries ("Workouts",
   * "Goals", "Insights") are sidebar labels that are on screen whichever page is mounted, so
   * those cases would have passed on the wrong page. The remaining two were stale anyway:
   * `/energy` titles itself "Food log", `/settings` is "Profile" in the chrome.
   *
   * The sidebar's own `h1` is "TrackVibe", so a level-1 heading identifies the page uniquely.
   */
  const APP_ROUTES = [
    { path: '/body', heading: 'Workouts' },
    { path: '/energy', heading: 'Food log' },
    { path: '/goals', heading: 'Stay on target' },
    { path: '/insights', heading: 'Patterns' },
    { path: '/settings', heading: 'Settings' },
  ] as const;

  for (const route of APP_ROUTES) {
    test(`serves ${route.path} to a signed-in user`, async ({ page }) => {
      await page.goto(route.path);

      await expect(page).toHaveURL(new RegExp(route.path.replace('/', '\\/')));
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
    });
  }

  test('shows the first-run empty state on Body when there are no workouts', async ({ page }) => {
    await page.goto('/body');

    await expect(page.getByText(/add your first workout/i)).toBeVisible();
  });

  test('invites a first log on Insights when there is nothing to plot', async ({ page }) => {
    await page.goto('/insights');

    await expect(page.getByText(/no patterns yet/i)).toBeVisible();
  });
});

test.describe('Mobile bottom navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('renders the bar with its centre voice control', async ({ page }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: /main navigation/i });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('button', { name: /open voice/i })).toBeVisible();
  });

  test('navigates between tabs', async ({ page }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: /main navigation/i });
    // The tab is labelled "Workouts"; `/body` is only its path. The bar is Home, Workouts,
    // Food, Profile — see `BOTTOM_NAV` in `components/layout/Base44Layout.tsx`.
    await nav.getByRole('link', { name: /workouts/i }).click();

    await expect(page).toHaveURL(/\/body/);
  });

  // The real-browser version of `useScrollToTopOnNavigate`. jsdom has no layout, so the unit
  // tests can only assert that `window.scrollTo` was called with the right options; only a
  // browser can prove the next tab actually opens at offset 0.
  //
  // Skipped along with the rest of this describe, so it is documentation of the intended
  // behaviour rather than a gate. Note the extra stub: `signIn()` answers every list endpoint
  // empty, which leaves /body shorter than 844px and makes the scroll below a no-op that
  // would assert nothing. Routes registered here take precedence over the ones from
  // `beforeEach`, so this one wins for workouts.
  test('opens the next tab at the top, not at the previous tab offset', async ({ page }) => {
    await page.route('**/api/workouts**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: Array.from({ length: 20 }, (_, i) => ({
            id: `w-${i}`,
            date: new Date().toISOString().slice(0, 10),
            title: `Session ${i + 1}`,
            type: 'strength',
            durationMinutes: 45,
            exercises: [],
            completed: true,
          })),
          total: 20,
          limit: 20,
          offset: 0,
          hasMore: false,
        }),
      })
    );

    await page.goto('/body');
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    const nav = page.getByRole('navigation', { name: /main navigation/i });
    await nav.getByRole('link', { name: /food/i }).click();

    await expect(page).toHaveURL(/\/energy/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  // Home is the one screen where a second voice control used to sit on top of the nav
  // mic; the hero was removed so there is exactly one per viewport.
  test('does not duplicate the voice control on Home', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(/tap to log by voice/i)).toHaveCount(0);
  });
});
