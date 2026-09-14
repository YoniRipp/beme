import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { darkColors, lightColors, type ColorRoles } from '../colors';

/**
 * `colors.ts` says, in its first line, that `frontend/src/index.css` is its source of
 * truth and that its values are that CSS converted to hex. That was true when it was
 * written — every one of the thirty values was re-derived by hand during an audit and
 * every one matched. Nothing kept it true. `colors.test.ts` only checks that the role
 * keys exist and are hex-shaped, so the next edit to either side could silently make the
 * two clients different colours, and the failure mode is "the native app looks slightly
 * off", which nobody files a bug for.
 *
 * This parses the CSS and compares. It is worth more than the mapping work it shipped
 * alongside, because it is the only thing that keeps that work true.
 *
 * Reading a sibling package's source from a test is unusual and deliberate: this is a
 * parity test, and parity with a file you refuse to read is an assertion about nothing.
 * The one path constant below is the whole of that reach.
 */

/** The web client's token source. The only path this package reaches outside itself. */
const INDEX_CSS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../frontend/src/index.css'
);

/**
 * `ColorRoles` role -> the CSS custom property it transcribes. This mirrors the
 * `role -> css custom property` table in `colors.ts`'s header comment, which is what
 * makes that comment executable rather than aspirational — change one, change both.
 */
const ROLE_TO_CSS_VAR: Partial<Record<keyof ColorRoles, string>> = {
  background: '--paper',
  surface: '--card',
  surfaceMuted: '--paper-2',
  muted: '--muted',
  text: '--ink',
  textMuted: '--ink-3',
  border: '--hairline',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  primarySoft: '--sage-50',
  food: '--terracotta',
  foodSoft: '--terracotta-light',
  workout: '--info',
  sleep: '--gold',
  danger: '--destructive',
  success: '--success',
  scrim: '--scrim',
};

/**
 * Roles with no web counterpart, skipped BY NAME with the reason inline rather than by
 * silently ignoring whatever fails to match.
 */
const NO_WEB_COUNTERPART: Partial<Record<keyof ColorRoles, string>> = {
  workoutSoft: 'the web never needed an "info-soft"; carried over from mobile\'s prior palette',
  sleepSoft: 'the web never needed a "gold-soft"; carried over from mobile\'s prior palette',
  shadow: 'not a custom property of its own — it is the hue inside the --shadow-* box-shadows, checked separately below',
};

type Scheme = 'light' | 'dark';

/** Pulls one selector's `--x: value;` declarations out of the stylesheet. */
function parseBlock(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`${selector} not found in index.css`);
  const open = css.indexOf('{', start);
  const end = css.indexOf('\n  }', open);
  if (open === -1 || end === -1) throw new Error(`could not delimit the ${selector} block`);

  // Comments come out FIRST, whole. Matching declarations against the raw text looks
  // like it works and does not: `index.css` documents `--scrim` with a comment reading
  // "Deliberately not derived from --ink or --foreground: …", and that colon makes
  // `--foreground: <everything to the next semicolon>` match, swallowing the real
  // `--scrim` declaration that follows it. Stripping per-value (`value.split('/*')[0]`)
  // is not enough — the comment has to be gone before the declarations are found.
  const body = css.slice(open + 1, end).replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations: Record<string, string> = {};
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    declarations[match[1]] = match[2].trim();
  }
  return declarations;
}

/**
 * Resolves `var(--x)` one level deep — `--background: var(--paper)` and dark's
 * `--primary-foreground: var(--paper)` both need it. Deliberately one level and not a
 * loop: the web has no deeper chains today, and a resolver that follows arbitrary depth
 * would quietly keep working if someone introduced one, which is a change worth noticing.
 */
function resolveVar(declarations: Record<string, string>, property: string): string {
  const raw = declarations[property];
  if (raw === undefined) throw new Error(`${property} is not declared in this block`);
  const indirect = /^var\((--[\w-]+)\)$/.exec(raw);
  if (!indirect) return raw;
  const target = declarations[indirect[1]];
  if (target === undefined) throw new Error(`${property} points at ${indirect[1]}, which is not declared`);
  if (/^var\(/.test(target)) {
    throw new Error(
      `${property} -> ${indirect[1]} -> another var(). This resolver follows exactly one level; ` +
        `add the second deliberately rather than making it recursive.`
    );
  }
  return target;
}

/** `H S% L%` (Tailwind/shadcn's wrapperless form) -> `#rrggbb`. CSS Color 4, section 10. */
function hslTripletToHex(triplet: string): string {
  const parts = triplet.trim().split(/\s+/);
  if (parts.length !== 3) throw new Error(`not an "H S% L%" triplet: '${triplet}'`);
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;

  const hue = (((h % 360) + 360) % 360) / 60;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 1 ? [c, x, 0] :
    hue < 2 ? [x, c, 0] :
    hue < 3 ? [0, c, x] :
    hue < 4 ? [0, x, c] :
    hue < 5 ? [x, 0, c] :
    [c, 0, x];
  const channel = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

const css = fs.readFileSync(INDEX_CSS, 'utf8');
const BLOCKS: Record<Scheme, Record<string, string>> = {
  light: parseBlock(css, ':root {'),
  dark: parseBlock(css, '.dark {'),
};
const PALETTES: Record<Scheme, ColorRoles> = { light: lightColors, dark: darkColors };

describe('shared colour tokens still equal the web palette', () => {
  it('accounts for every ColorRoles key — a new role cannot be added without a decision', () => {
    const accountedFor = new Set([...Object.keys(ROLE_TO_CSS_VAR), ...Object.keys(NO_WEB_COUNTERPART)]);
    const unaccounted = Object.keys(lightColors).filter((role) => !accountedFor.has(role));

    expect(unaccounted, 'add each of these to ROLE_TO_CSS_VAR, or to NO_WEB_COUNTERPART with a reason').toEqual([]);
  });

  describe.each(['light', 'dark'] as const)('%s', (scheme) => {
    const declarations = BLOCKS[scheme];
    const palette = PALETTES[scheme];
    const roles = Object.entries(ROLE_TO_CSS_VAR) as [keyof ColorRoles, string][];

    it.each(roles)('%s matches %s', (role, cssVar) => {
      expect(hslTripletToHex(resolveVar(declarations, cssVar))).toBe(palette[role]);
    });

    it('shadow matches the hue the --shadow-* box-shadows are composited from', () => {
      // `shadow` has no custom property of its own: the web writes the colour inline in
      // each shadow step (`0 1px 2px 0 hsl(28 20% 20% / 0.04)`). Read the first hsl() out
      // of --shadow-sm and check the app's role against it — dropping the alpha, which is
      // per-step and not part of the colour.
      const shadowSm = declarations['--shadow-sm'];
      const hsl = /hsl\(\s*([\d.]+)\s+([\d.]+%)\s+([\d.]+%)/.exec(shadowSm);
      expect(hsl, `could not find an hsl() colour in --shadow-sm: '${shadowSm}'`).not.toBeNull();

      expect(hslTripletToHex(`${hsl![1]} ${hsl![2]} ${hsl![3]}`)).toBe(palette.shadow);
    });
  });
});

describe('the parity test itself', () => {
  it('converts HSL the same way the browser does, on values with known answers', () => {
    // If this conversion were wrong, every assertion above would be comparing two wrong
    // numbers that agree — the palette was transcribed by hand from these same triplets.
    expect(hslTripletToHex('0 0% 100%')).toBe('#ffffff');
    expect(hslTripletToHex('0 0% 0%')).toBe('#000000');
    expect(hslTripletToHex('0 100% 50%')).toBe('#ff0000');
    expect(hslTripletToHex('120 100% 50%')).toBe('#00ff00');
    expect(hslTripletToHex('240 100% 50%')).toBe('#0000ff');
    expect(hslTripletToHex('60 100% 50%')).toBe('#ffff00');
    expect(hslTripletToHex('180 100% 50%')).toBe('#00ffff');
    expect(hslTripletToHex('300 100% 50%')).toBe('#ff00ff');
  });

  it('can fail: a one-point lightness change in the CSS is a different hex', () => {
    // Verifying the test can go red without editing the real stylesheet.
    expect(hslTripletToHex('32 18% 93%')).toBe(lightColors.muted);
    expect(hslTripletToHex('32 18% 92%')).not.toBe(lightColors.muted);
  });

  it('follows one level of var() indirection and refuses a second', () => {
    const declarations = { '--a': 'var(--b)', '--b': '1 2% 3%', '--c': 'var(--a)' };
    expect(resolveVar(declarations, '--a')).toBe('1 2% 3%');
    expect(() => resolveVar(declarations, '--c')).toThrow(/exactly one level/);
  });

  it('does not let a colon inside a comment eat the declaration after it', () => {
    // The exact shape that broke this parser on first run, against `--scrim`.
    const block = parseBlock(
      ':root {\n  /* not derived from --ink or --foreground: see below */\n  --scrim: 20 14% 8%;\n  }',
      ':root {'
    );
    expect(block['--scrim']).toBe('20 14% 8%');
    expect(block['--foreground']).toBeUndefined();
  });

  it('actually read the two blocks, rather than silently matching an empty one', () => {
    expect(Object.keys(BLOCKS.light).length).toBeGreaterThan(20);
    expect(Object.keys(BLOCKS.dark).length).toBeGreaterThan(20);
    expect(BLOCKS.light['--paper']).not.toBe(BLOCKS.dark['--paper']);
  });
});
