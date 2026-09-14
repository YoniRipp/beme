import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The bottom chrome has to fit inside the strip the layout reserves for it.
 *
 * That is the invariant the AI Coach FAB broke: it stood at `bottom: calc(safe + 9.75rem)`
 * — 156px up, 204px at its top — while `<main>` reserved `pb-32` (128px) and the nav's scrim
 * was `h-32` (128px). 28px of a 48px control hung above everything meant to contain it, so
 * it floated on live content at every scroll offset and covered the right 48px of the
 * content column: card delete buttons, "Copy day", a dozen Profile switches.
 *
 * jsdom has no layout engine, so no rendering test can measure this — `e2e/ai-fab-overlap`
 * does that in a real browser, and CI does not run Playwright. What *can* run everywhere is
 * arithmetic on the numbers themselves. If someone grows the pill, the dock or the gap and
 * forgets `--bottom-chrome`, or reintroduces a literal in either consumer, this fails.
 *
 * Same reasoning as `index.test.ts`: a string assertion is worth writing when it guards the
 * one fact a unit test otherwise cannot see.
 */
const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../..');
const read = (path: string) => readFileSync(resolve(src, path), 'utf8');

// Comments are stripped first: they talk *about* these variables, and a prose colon would
// otherwise be indistinguishable from a declaration.
const css = read('index.css').replace(/\/\*[\s\S]*?\*\//g, '');
const bottomNavigation = read('components/layout/BottomNavigation.tsx');
const base44Layout = read('components/layout/Base44Layout.tsx');

const ROOT_FONT_SIZE = 16;

/** `0.875rem` / `14px` → 14. Anything else is a value this guard was not written for. */
function toPx(value: string): number {
  const match = /^(-?[\d.]+)(rem|px)$/.exec(value.trim());
  if (!match) throw new Error(`not a plain length: "${value}"`);
  const n = Number(match[1]);
  return match[2] === 'rem' ? n * ROOT_FONT_SIZE : n;
}

/** The declared value of a custom property in `:root`, as written. */
function declaration(name: string): string {
  // Non-greedy up to the first `;`, which is safe because none of these values contain one.
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
  if (!match) throw new Error(`--${name} is not declared in index.css`);
  return match[1].replace(/\s+/g, ' ').trim();
}

const px = (name: string) => toPx(declaration(name));

/**
 * Sums a `calc(...)` of `+`-joined terms, where each term is either a plain length or a
 * `var(--x)` naming another plain length. Deliberately narrow: a term this cannot resolve
 * throws rather than being skipped, so the total can never come out quietly too small.
 */
function sumCalc(name: string): number {
  const body = /^calc\((.*)\)$/s.exec(declaration(name))?.[1];
  if (!body) throw new Error(`--${name} is not a calc()`);
  if (/[-*/]/.test(body.replace(/--[\w-]+/g, ''))) {
    throw new Error(`--${name} uses arithmetic this guard cannot evaluate: ${body}`);
  }
  return body
    .split('+')
    .map((term) => {
      const ref = /^\s*var\(\s*(--[\w-]+)\s*\)\s*$/.exec(term);
      return ref ? px(ref[1].slice(2)) : toPx(term);
    })
    .reduce((a, b) => a + b, 0);
}

describe('bottom chrome geometry', () => {
  it('reserves at least as much as the chrome occupies', () => {
    const barInset = px('bar-inset');
    const barHeight = px('bar-height');
    const dockGap = px('dock-gap');
    const dockSize = px('dock-size');

    // Distance from the nav's content edge to the top of the docked AI button.
    const tallestChrome = barInset + barHeight + dockGap + dockSize;

    expect(sumCalc('bottom-chrome')).toBeGreaterThanOrEqual(tallestChrome);
  });

  // `frontend/mobile-ui`: icon-only buttons still need a 44px hit area.
  it('keeps the docked button at a real touch target', () => {
    expect(px('dock-size')).toBeGreaterThanOrEqual(44);
  });

  it('derives the scrim and the reserved strip from the one variable', () => {
    // The scrim covers the strip; `<main>` reserves it. Both add the home indicator, which
    // the nav pads for itself and neither of these two is inside.
    expect(bottomNavigation).toContain('h-[calc(var(--bottom-chrome)+var(--safe-bottom))]');
    expect(base44Layout).toContain('pb-[calc(var(--bottom-chrome)+var(--safe-bottom))]');
  });

  it('leaves no viewport-relative literal behind for the AI button', () => {
    expect(base44Layout).not.toContain('9.75rem');
    expect(bottomNavigation).not.toContain('9.75rem');
    // The desktop pair is a different system and keeps its own offsets (Task 4 of the spec).
    expect(base44Layout).toContain('lg:bottom-[5.25rem]');
  });

  /**
   * `frontend/components`: pages compose, they don't style. Water and Energy each carried a
   * bottom pad to dodge the chrome the shell is supposed to reserve for them; with the
   * reservation correct, both are gone. A page re-adding one means the shell value is wrong.
   */
  it('leaves no page working around the shell reservation', () => {
    expect(read('pages/Water.tsx')).not.toMatch(/<Page[^>]*\bpb-/);
    expect(read('pages/Energy.tsx')).not.toMatch(/<Page[^>]*\bpb-/);
  });
});
