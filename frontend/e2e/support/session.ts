import type { Page } from '@playwright/test';

/**
 * A signed-in session for E2E, without a backend.
 *
 * `AuthContext` bootstraps from `POST /api/auth/refresh` — not `GET /api/auth/me`. The
 * comment above `loadUser` in `src/context/AuthContext.tsx` says why: refresh validates the
 * session *and* returns the user, so `/auth/me` would cost a second round trip on the launch
 * path. A spec that stubs `/auth/me` therefore stubs a call the app never makes at startup
 * and lands on `/login` every time.
 *
 * Extracted from `safe-area.spec.ts`, which is where this was first worked out. One pattern,
 * used by every authenticated spec.
 */

export const TEST_USER = {
  id: 'e2e-user',
  email: 'e2e@example.com',
  name: 'E2E Tester',
  role: 'user',
  subscriptionStatus: 'free',
};

/** The `PaginatedResponse<T>` envelope every list endpoint returns, with nothing in it. */
export const EMPTY_PAGE = { data: [], total: 0, limit: 0, offset: 0, hasMore: false };

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Endpoint shapes the shell actually needs. The catch-all in `signIn` answers everything
 * else with an empty page, but the handful here return a bare array or a plain object, and a
 * page handed the wrong shape throws into the error boundary and takes the shell with it.
 * The profile has to read as complete, or Home renders `SetupWizard` over the app.
 *
 * Order matters: the first pattern that matches wins, so `/water-entries/history` (an array)
 * has to come before `/water-entries` (one day's object).
 */
const API_STUBS: Array<[RegExp, unknown]> = [
  [/\/api\/auth\/refresh/, { user: TEST_USER, token: 'header.payload.signature' }],
  [
    /\/api\/profile/,
    { id: 'e2e-profile', waterGoalGlasses: 8, cycleTrackingEnabled: false, setupCompleted: true },
  ],
  [/\/api\/subscription\/status/, { status: 'free', currentPeriodEnd: null }],
  [/\/api\/streaks/, []],
  [/\/api\/exercises/, []],
  [/\/api\/weight-entries/, []],
  [/\/api\/cycle-entries/, []],
  [/\/api\/water-entries\/history/, []],
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
 * Answers the whole API, starting with the call that signs the user in. Every list endpoint
 * comes back empty so pages settle into their loaded — and empty — states instead of hanging
 * on a backend that is not running.
 *
 * @param extraStubs prepended to the built-in table, so a spec can give one endpoint real
 *   data without restating the rest.
 */
export async function signIn(page: Page, extraStubs: Array<[RegExp, unknown]> = []) {
  const stubs = [...extraStubs, ...API_STUBS];

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
      const stub = stubs.find(([pattern]) => pattern.test(url));
      return route.fulfill(json(stub ? stub[1] : EMPTY_PAGE, origin));
    }
  );
}
