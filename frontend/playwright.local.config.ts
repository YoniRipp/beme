import { defineConfig, devices } from '@playwright/test';

// Throwaway local config — NOT committed. The checked-in config has
// `reuseExistingServer`, so a run there silently tests whichever checkout owns 5173.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5200',
    trace: 'off',
    screenshot: 'off',
  },
  timeout: 30_000,
  expect: { timeout: 10_000 },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
