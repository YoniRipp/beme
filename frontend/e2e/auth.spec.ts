import { test, expect } from '@playwright/test';

/**
 * The signed-out surface: what the login and signup forms render, and what they refuse.
 *
 * These run without a backend — nothing here submits successfully. Validation is asserted
 * through the browser's own constraint API rather than by watching for an error toast,
 * so the tests stay honest about what they are actually exercising.
 */

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders the form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'TrackVibe' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
  });

  test('marks the email field required', async ({ page }) => {
    await page.getByRole('button', { name: /^sign in$/i }).click();

    const valid = await page.getByLabel('Email').evaluate(
      (el: HTMLInputElement) => el.checkValidity()
    );
    expect(valid).toBe(false);
    await expect(page).toHaveURL(/\/login/);
  });

  test('asks for a well-formed email', async ({ page }) => {
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('somepassword');

    const valid = await page.getByLabel('Email').evaluate(
      (el: HTMLInputElement) => el.checkValidity()
    );
    expect(valid).toBe(false);
  });

  test('offers the social sign-in section', async ({ page }) => {
    await expect(page.getByText(/or continue with/i)).toBeVisible();
  });
});

test.describe('Signup page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('renders the form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account|sign up/i })).toBeVisible();
  });

  test('will not submit an empty form', async ({ page }) => {
    await page.getByRole('button', { name: /create account|sign up/i }).click();

    await expect(page).toHaveURL(/\/signup/);
  });
});

test.describe('Forgot password page', () => {
  test('renders the reset form', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});

test.describe('Reset password page', () => {
  // The address the reset email points at. `token` is the shape the backend mints,
  // `crypto.randomBytes(32).toString('hex')`; no backend runs here, so it is never redeemed.
  const RESET_LINK = `/reset-password?token=${'a1b2c3d4'.repeat(8)}&email=runner%40example.com`;

  test('renders the form for a link that carries a token', async ({ page }) => {
    await page.goto(RESET_LINK);

    await expect(page).toHaveURL(/\/reset-password/);
    await expect(page.getByRole('heading', { name: /choose a new password/i })).toBeVisible();
    await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm new password', { exact: true })).toBeVisible();
  });

  test('explains itself instead of showing a form when the token is missing', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(
      page.getByRole('heading', { name: /reset link is no longer valid/i })
    ).toBeVisible();
    await expect(page.getByLabel('New password', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /request a new link/i })).toBeVisible();
  });

  test('rejects a weak password before any network call', async ({ page }) => {
    await page.goto(RESET_LINK);

    await page.getByLabel('New password', { exact: true }).fill('alllowercase1');
    await page.getByLabel('Confirm new password', { exact: true }).fill('alllowercase1');
    await page.getByRole('button', { name: /update password/i }).click();

    await expect(page.getByRole('alert')).toContainText(/uppercase letter/i);
    await expect(page).toHaveURL(/\/reset-password/);
  });
});
