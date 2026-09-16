import { defineConfig, devices } from '@playwright/test';
import {
  backendBaseURL,
  backendPort,
  frontendBaseURL,
  frontendPort,
  skipBackend,
} from './e2e/support/servers';

/**
 * Playwright E2E test configuration for TrackVibe.
 *
 * Ports are derived per checkout and the running servers are identity-checked in
 * `globalSetup` — see `e2e/support/servers.ts` for why, and `CLAUDE.md` for the env
 * overrides (`E2E_FRONTEND_PORT`, `E2E_BACKEND_PORT`, `E2E_ALLOW_FOREIGN_SERVER`).
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Refuse to run against a dev server belonging to another checkout */
  globalSetup: './e2e/support/global-setup.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use */
  reporter: [['html', { open: 'never' }]],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like \`await page.goto('/')\` */
    baseURL: frontendBaseURL,

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Take a screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Global timeout for each test */
  timeout: 30_000,

  /* Timeout for each expect() assertion */
  expect: {
    timeout: 10_000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Run dev servers before starting the tests.
   * Both run on ports derived from this checkout's path, so concurrent worktrees do not
   * fight over 5173/3000; `globalSetup` then verifies that what answers is in fact ours.
   * Set SKIP_BACKEND=1 to run against whatever API is already up (or none at all).
   */
  webServer: [
    // Backend server (Express). PORT is passed explicitly, which also means the API boots in
    // a fresh clone that has no backend/.env — where it previously exited on a missing PORT
    // and the run silently fell through to whoever owned 3000.
    ...(!skipBackend
      ? [
          {
            command: 'npm run dev',
            cwd: '../backend',
            env: {
              PORT: String(backendPort),
              // The app no longer lives on 5173, so a `backend/.env` that pins
              // `CORS_ORIGIN=http://localhost:5173` — the value README documents — would
              // reject every call the E2E app makes. Name the origin we actually serve.
              // `dotenv` does not override an existing variable, so this wins over `.env`.
              CORS_ORIGIN: frontendBaseURL,
              FRONTEND_ORIGIN: frontendBaseURL,
              // This is a throwaway API for one test run, but it shares the developer's
              // DATABASE_URL and Redis. Without this it starts a second voice worker and
              // compaction scheduler on the same queues and eats jobs meant for their own
              // backend — the cross-checkout interference this config exists to stop,
              // one layer down. No spec needs a worker.
              SEPARATE_WORKERS: 'true',
              // Opt in to `checkout` in the /health payload. Off by default so a developer's
              // ordinary `npm run dev:backend` does not hand its absolute path to any page
              // that fetches localhost:3000. See the note in `backend/app.ts`.
              E2E_IDENTITY: '1',
            },
            url: `${backendBaseURL}/health`,
            reuseExistingServer: !process.env.CI,
            timeout: 30_000,
            ignoreHTTPSErrors: true,
          },
        ]
      : []),
    // Frontend server (Vite). `--strictPort` matters: without it Vite quietly moves to the
    // next free port when ours is taken, and the suite would run against the squatter.
    {
      command: `npm run dev -- --port ${frontendPort} --strictPort`,
      // The app defaults its API base to `:3000`; point it at the backend we actually
      // started. Under SKIP_BACKEND the default is left alone — that flag means the
      // developer is supplying the API themselves.
      env: skipBackend ? {} : { VITE_API_URL: backendBaseURL },
      url: frontendBaseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
