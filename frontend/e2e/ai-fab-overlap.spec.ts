import { test, expect, type Page } from '@playwright/test';
import { signIn, TEST_USER } from './support/session';

/**
 * The AI Coach button, as geometry.
 *
 * It used to be `position: fixed` at `bottom: calc(safe + 9.75rem)` — a literal in
 * `Base44Layout` that corresponded to nothing the bottom bar measured. At 390px it owned
 * x 326…374 and y 156…204 above the viewport bottom, while the scrim and `<main>`'s
 * reservation both stopped at 128. So 28px of a 48px control stood clear of every piece of
 * chrome meant to contain it, over the right 48px of a 358px content column, at every
 * scroll offset: the delete button on `FoodCard`, `WorkoutCard` and `GoalCard`, half of
 * "Copy day" on Food, and ~28px of each right-aligned switch down Profile.
 *
 * Static offsets are what caused that, so a class-name assertion is not the test. These are
 * bounding boxes read out of a real browser at a real phone width.
 *
 * Two properties, and the second is the one that generalises:
 *
 *  1. At rest — the page scrolled to the end — nothing interactive in `<main>` intersects
 *     the button. That is the reservation doing its job.
 *  2. At any offset, the button lies wholly inside the bottom chrome strip: the region the
 *     scrim paints and `<main>` reserves. A fixed element always has *something* scrolling
 *     under it mid-scroll — that is what the bar has always done and nobody reads it as a
 *     bug — so the honest claim is that this control adds no band of its own. Today's
 *     button fails this by 28px; anything that drifts out of the strip again fails it too.
 */

const PHONE = { width: 390, height: 844 };

/** Every screen the report named, plus the two the sweep did not reach. */
const SCREENS = [
  { path: '/', name: 'Home' },
  { path: '/energy', name: 'Food' },
  { path: '/body', name: 'Workouts' },
  { path: '/goals', name: 'Goals' },
  { path: '/water', name: 'Water' },
  { path: '/settings', name: 'Profile' },
] as const;

const INTERACTIVE = 'a, button, input, select, textarea, [role="button"], [role="switch"], [tabindex]:not([tabindex="-1"])';

/**
 * `hasAiAccess` is `isPro || aiCallsRemaining > 0`, and the shared `TEST_USER` has neither —
 * so the button does not render for it. Every free account starts the month with a quota,
 * which is the population this bug actually hit, so that is the account modelled here.
 */
async function signInWithAiQuota(page: Page) {
  await signIn(page, [
    [
      /\/api\/auth\/refresh/,
      { user: { ...TEST_USER, aiCallsRemaining: 10 }, token: 'header.payload.signature' },
    ],
  ]);
}

/** Signs in with quota, then lands on `path` with the button on screen. */
async function openScreen(page: Page, path: string) {
  await signInWithAiQuota(page);
  await page.goto(path);
  await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open AI Coach' })).toBeVisible();
}

/** The visible AI Coach button. Both renderings are in the DOM; CSS shows one. */
function aiCoach(page: Page) {
  return page.getByRole('button', { name: 'Open AI Coach' });
}

type Box = { x: number; y: number; width: number; height: number };

const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Interactive descendants of `<main>` whose box overlaps `box`, described for the failure. */
async function overlappedControls(page: Page, box: Box, selector: string) {
  return page.evaluate(
    ({ box, selector }) => {
      const main = document.querySelector('main');
      if (!main) throw new Error('the app shell rendered without a <main>');
      const hit = (a: DOMRect) =>
        a.left < box.x + box.width &&
        box.x < a.right &&
        a.top < box.y + box.height &&
        box.y < a.bottom;
      return [...main.querySelectorAll(selector)]
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && hit(rect);
        })
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const label =
            el.getAttribute('aria-label') ?? (el.textContent ?? '').trim().slice(0, 40);
          return `<${el.tagName.toLowerCase()}> "${label}" at ${Math.round(rect.left)},${Math.round(rect.top)} ${Math.round(rect.width)}x${Math.round(rect.height)}`;
        });
    },
    { box, selector }
  );
}

/** The strip the scrim paints and `<main>` reserves, in px measured up from the viewport bottom. */
async function chromeStripHeight(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;height:calc(var(--bottom-chrome) + var(--safe-bottom))';
    document.body.appendChild(probe);
    const height = probe.getBoundingClientRect().height;
    probe.remove();
    if (!height) throw new Error('--bottom-chrome is not defined');
    return height;
  });
}

/**
 * Scrolls to the real end of the document.
 *
 * One `scrollTo` is not enough: Home and Profile keep growing as their queries settle, so a
 * scroll issued early clamps to the height at that moment and is then overtaken by content
 * arriving underneath. Scroll until the document stops getting taller — otherwise the
 * "at rest" assertion is measuring a page that is not at rest.
 */
async function scrollToBottom(page: Page) {
  await page.waitForLoadState('networkidle');

  let previous = -1;
  let stable = 0;
  for (let i = 0; i < 25 && stable < 3; i += 1) {
    const height = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      return document.documentElement.scrollHeight;
    });
    stable = height === previous ? stable + 1 : 0;
    previous = height;
    await page.waitForTimeout(120);
  }
  if (stable < 3) throw new Error('the document never stopped growing');
}

test.describe('AI Coach button — overlap', () => {
  test.use({ viewport: PHONE });

  // One engine is enough: this is layout arithmetic, not an engine quirk, and the bug
  // reproduced identically in every browser. WebKit is the one the report came from.
  test.skip(({ browserName }) => browserName !== 'webkit', 'geometry, measured once');

  for (const screen of SCREENS) {
    test(`covers no control on ${screen.name}`, async ({ page }) => {
      await openScreen(page, screen.path);
      await scrollToBottom(page);

      const box = await aiCoach(page).boundingBox();
      expect(box, 'the AI Coach button has no box').not.toBeNull();

      const covered = await overlappedControls(page, box!, INTERACTIVE);
      expect(covered, `${screen.name}: AI Coach covers ${covered.length} control(s)`).toEqual([]);
    });

    test(`stays inside the bottom chrome strip on ${screen.name}`, async ({ page }) => {
      await openScreen(page, screen.path);

      const strip = await chromeStripHeight(page);
      const viewportHeight = page.viewportSize()!.height;

      for (const where of ['top', 'bottom'] as const) {
        if (where === 'bottom') await scrollToBottom(page);

        const box = (await aiCoach(page).boundingBox())!;
        const topAboveBottomEdge = viewportHeight - box.y;

        expect(
          topAboveBottomEdge,
          `${screen.name} at ${where} of scroll: the button reaches ${Math.round(topAboveBottomEdge)}px up, past the ${strip}px strip`
        ).toBeLessThanOrEqual(strip);
      }
    });
  }

  test('shares the bottom bar edge instead of its own', async ({ page }) => {
    await openScreen(page, '/');

    const button = (await aiCoach(page).boundingBox())!;
    const bar = (await page
      .locator('nav[aria-label="Main navigation"] > div')
      .nth(1)
      .boundingBox())!;

    // `right-4` (16px) beside the bar's `mx-3.5` (14px) was two chrome elements on one edge,
    // 2px apart, on unrelated constants. One edge now — to within the pill's own 1px
    // hairline, which the dock is positioned inside (`right: 0` resolves against the
    // padding box, not the border box).
    const gap = Math.abs(button.x + button.width - (bar.x + bar.width));
    expect(gap, `the dock sits ${gap}px off the bar's right edge`).toBeLessThanOrEqual(1);
    // And it never reaches outside the bar's footprint horizontally.
    expect(button.x).toBeGreaterThanOrEqual(bar.x);
  });

  test('still opens the AI Coach panel, and is gone on /insights', async ({ page }) => {
    await openScreen(page, '/');
    await aiCoach(page).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.goto('/insights');
    await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeVisible();
    await expect(aiCoach(page)).toHaveCount(0);
  });

  test('is absent for a free account with no quota left', async ({ page }) => {
    // The default `TEST_USER`: free, `aiCallsRemaining` unset, so `hasAiAccess` is false.
    await signIn(page);
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeVisible();
    await expect(aiCoach(page)).toHaveCount(0);
  });
});
