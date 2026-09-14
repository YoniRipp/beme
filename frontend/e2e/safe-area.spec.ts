import { test, expect, type Page } from '@playwright/test';

/**
 * Safe areas, as geometry rather than as class names.
 *
 * `BottomNavigation.test.tsx` asserts that the string `pb-safe` appears in a className, and
 * it was green for the entire life of the bug this file was written for: `index.html` had no
 * `viewport-fit=cover`, so every `env(safe-area-inset-*)` resolved to 0 and the app's whole
 * safe-area vocabulary was inert. jsdom has no layout engine and no `env()`, so no unit test
 * could ever have noticed.
 *
 * `env()` cannot be set by a test either — no headless browser reports a notch. That is why
 * `src/index.css` names the four insets as `--safe-top/-right/-bottom/-left` and everything
 * reads them from there: the variables are a seam this file can drive.
 *
 * The last test is the important one. The insets are 0 in every desktop browser and on every
 * phone without a cutout, so a correct fix is a *visual no-op* off-device. It re-runs the
 * measurements with the variables pinned to `0px` and requires the layout the web app ships
 * today — if the fix ever leaks a 59px band onto the web, that test fails.
 */

/** iPhone 14/15/16/17 Pro, portrait. */
const NOTCH = { top: 59, bottom: 34 };

/** `mb-3.5` on the nav pill — the gap it keeps from the bottom edge with no home indicator. */
const PILL_MARGIN = 14;

const TEST_USER = {
  id: 'e2e-user',
  email: 'e2e@example.com',
  name: 'E2E Tester',
  role: 'user',
  subscriptionStatus: 'free',
};

const EMPTY_PAGE = { data: [], total: 0, limit: 0, offset: 0, hasMore: false };

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Endpoint shapes the shell actually needs. The catch-all below answers everything else with
 * an empty page, but the handful here return a bare array or an object, and a page that gets
 * the wrong shape throws into the error boundary and takes the whole shell with it. The
 * profile has to read as complete, or Home renders `SetupWizard` over the app instead.
 */
const API_STUBS: Array<[RegExp, unknown]> = [
  [/\/api\/auth\/refresh/, { user: TEST_USER, token: 'header.payload.signature' }],
  [
    /\/api\/profile/,
    { id: 'e2e-profile', waterGoalGlasses: 8, cycleTrackingEnabled: false, setupCompleted: true },
  ],
  [/\/api\/streaks/, []],
  [/\/api\/weight-entries/, []],
  [/\/api\/cycle-entries/, []],
  [/\/api\/water-entries/, { date: TODAY, glasses: 0, mlTotal: 0 }],
];

/**
 * The client posts to `:3000` from the dev server's origin, so a fulfilled response is still
 * cross-origin and still has to pass the browser's CORS check. The allowed origin is echoed
 * from the request rather than hard-coded: `credentials: 'include'` forbids `*`, and the dev
 * server does not always get port 5173.
 */
function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Client-Platform',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  };
}

function json(body: unknown, origin: string) {
  return {
    status: 200,
    contentType: 'application/json',
    headers: corsHeaders(origin),
    body: JSON.stringify(body),
  };
}

/**
 * `AuthContext` bootstraps from `POST /api/auth/refresh` — not `/api/auth/me`, which is what
 * `dashboard.spec.ts` stubs and why its authenticated cases are skipped. Answering the call
 * the app actually makes is enough to reach the shell.
 */
async function signIn(page: Page) {
  // Matched on the pathname rather than with a `**/api/**` glob: that glob also matches
  // Vite's own module URLs (`/src/core/api/client.ts`) and answers them with JSON, which
  // kills the app before it boots.
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const origin = (await route.request().headerValue('origin')) ?? '*';
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders(origin), body: '' });
      }
      const url = route.request().url();
      const stub = API_STUBS.find(([pattern]) => pattern.test(url));
      return route.fulfill(json(stub ? stub[1] : EMPTY_PAGE, origin));
    }
  );
}

/** Lands on the app shell and makes the page taller than the viewport, so there is something
 *  to scroll under the header — the reported repro is a *scrolled* page. */
async function openShell(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeVisible();
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) throw new Error('the app shell rendered without a <main>');
    const filler = document.createElement('div');
    filler.id = 'e2e-tall-content';
    filler.style.height = '2000px';
    main.appendChild(filler);
  });
}

/** `env()` is unsettable, the variables are not. Later style tags win, so this can be called
 *  more than once to move the "device" under the same page. */
async function setInsets(page: Page, top: number, bottom: number) {
  await page.addStyleTag({
    content: `:root{--safe-top:${top}px;--safe-right:0px;--safe-bottom:${bottom}px;--safe-left:0px;}`,
  });
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector('header');
    const row = header?.firstElementChild;
    const nav = document.querySelector('nav[aria-label="Main navigation"]');
    const pill = nav?.querySelector('button[aria-label="Open voice"]')?.parentElement;
    if (!header || !row || !nav || !pill) throw new Error('shell chrome not found');
    return {
      headerPaddingTop: getComputedStyle(header).paddingTop,
      headerRowTop: Math.round(row.getBoundingClientRect().top),
      headerBottom: Math.round(header.getBoundingClientRect().bottom),
      navPaddingBottom: getComputedStyle(nav).paddingBottom,
      pillGapFromBottom: Math.round(window.innerHeight - pill.getBoundingClientRect().bottom),
    };
  });
}

/**
 * Everything that is hit-testable across the band the system clock occupies, sampled on a
 * grid rather than at one point: the two things that land there in practice are a page
 * heading (inside `<main>`) and the header's own controls (the menu button, the page title),
 * and they are at different heights.
 */
async function probeStatusBarStrip(page: Page, stripHeight: number) {
  return page.evaluate((height) => {
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    if (!main || !header) throw new Error('shell chrome not found');
    const xs = [8, 100, 195, 300, 382];
    const ys = [2, 10, 20, 30, 45, 56].filter((y) => y < height);
    return ys.flatMap((y) =>
      xs.map((x) => {
        const el = document.elementFromPoint(x, y);
        return {
          x,
          y,
          tag: el?.tagName.toLowerCase() ?? null,
          insideMain: !!el && main.contains(el),
          // The header's own background painting the strip is the point of the fix. Anything
          // *inside* the header showing up here is a control or a label drawn over the clock.
          insideHeaderContent: !!el && el !== header && header.contains(el),
        };
      })
    );
  }, stripHeight);
}

async function scrollToBottom(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => window.scrollY > 100);
}

test.describe('Safe areas', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // iOS is the platform with the cutout and WebKit is the engine that ships there; running
  // the same geometry three times over adds no signal.
  test.skip(({ browserName }) => browserName !== 'webkit', 'iOS safe-area behaviour');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await openShell(page);
  });

  test('leaves nothing but chrome in the status-bar strip, at any scroll offset', async ({
    page,
  }) => {
    await setInsets(page, NOTCH.top, NOTCH.bottom);

    const atRest = await probeStatusBarStrip(page, NOTCH.top);
    expect(atRest.filter((hit) => hit.insideMain || hit.insideHeaderContent)).toEqual([]);

    await scrollToBottom(page);

    const scrolled = await probeStatusBarStrip(page, NOTCH.top);
    expect(scrolled.filter((hit) => hit.insideMain || hit.insideHeaderContent)).toEqual([]);
    // Nothing sampled is the empty page background either — the header covers the band.
    expect(scrolled.every((hit) => hit.tag === 'header')).toBe(true);
  });

  test('reserves the inset in the header and above the home indicator', async ({ page }) => {
    await setInsets(page, NOTCH.top, NOTCH.bottom);

    const geometry = await measure(page);

    // The padding is on the header itself, so its background paints the strip.
    expect(geometry.headerPaddingTop).toBe(`${NOTCH.top}px`);
    expect(geometry.headerRowTop).toBeGreaterThanOrEqual(NOTCH.top);
    // The pill clears the home indicator by its own margin.
    expect(geometry.navPaddingBottom).toBe(`${NOTCH.bottom}px`);
    expect(geometry.pillGapFromBottom).toBeGreaterThanOrEqual(NOTCH.bottom);
  });

  test('is inert with no insets — the web layout is unchanged', async ({ page }) => {
    await setInsets(page, 0, 0);
    const zero = await measure(page);

    expect(zero.headerPaddingTop).toBe('0px');
    expect(zero.headerRowTop).toBe(0);
    expect(zero.navPaddingBottom).toBe('0px');
    expect(zero.pillGapFromBottom).toBe(PILL_MARGIN);

    // The same band, re-probed. With no cutout the header's controls *should* sit in the
    // top 57px — that is the layout the web app has always had — but page content still
    // never gets above the chrome.
    await scrollToBottom(page);
    const hits = await probeStatusBarStrip(page, NOTCH.top);
    expect(hits.filter((hit) => hit.insideMain)).toEqual([]);
    expect(hits.some((hit) => hit.insideHeaderContent)).toBe(true);

    // And the chrome grows by exactly the inset — no extra band anywhere.
    await setInsets(page, NOTCH.top, NOTCH.bottom);
    const notched = await measure(page);

    expect(notched.headerBottom - zero.headerBottom).toBe(NOTCH.top);
    expect(notched.pillGapFromBottom - zero.pillGapFromBottom).toBe(NOTCH.bottom);
  });
});
