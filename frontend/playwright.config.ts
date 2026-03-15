import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for TrackVibe.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
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
    baseURL: 'http://localhost:5173',

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
   * In CI, both backend and frontend are started.
   * Locally, set SKIP_BACKEND=1 to skip the backend server if no DB is available.
   */
  webServer: [
    // Backend server (Express on port 3000)
    // Skipped when SKIP_BACKEND=1 or when the backend is already running.
    ...(!process.env.SKIP_BACKEND
      ? [
          {
            command: 'npm run dev',
            cwd: '../backend',
            url: 'http://localhost:3000/health',
            reuseExistingServer: !process.env.CI,
            timeout: 30_000,
            ignoreHTTPSErrors: true,
          },
        ]
      : []),
    // Frontend server (Vite on port 5173)
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
