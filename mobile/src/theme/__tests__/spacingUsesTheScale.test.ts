import path from 'path';
import ts from 'typescript';
import { spacing, radii } from '@trackvibe/shared/tokens';
import { SRC_ROOT, collectSourceFiles, parseSourceFile } from '../paletteGuardSupport';

/**
 * Spacing and corners come from the scale, not from a number someone liked.
 *
 * The scale itself already agrees between the clients — shared `spacing` is
 * `4 · 8 · 12 · 16 · 24 · 32`, `mobile-ui.md` names the same increments, and the web is on
 * Tailwind's stock 4px steps. What was missing is anything stopping a literal, and 44 numeric
 * spacing values had accumulated beside 74 token references, six of them off-scale entirely.
 *
 * Follows `collectHexColorLiterals`'s design note: match on the **value shape and the key's
 * role**, never an allowlist of key names. `paddingStart`, `insetBlock` and whatever React
 * Native adds next are spacing whether or not anyone remembered to list them, which is
 * exactly how the frozen-palette regex missed three shapes it was written to catch.
 */

const SPACING_KEY = /^(padding|margin)(Top|Bottom|Left|Right|Start|End|Horizontal|Vertical)?$/;
const GAP_KEY = /^(gap|rowGap|columnGap)$/;

/**
 * Tailwind's stock scale in pixels: every multiple of 4, plus the four half-steps below 16.
 *
 * The named `spacing` export carries six of these. The web reaches the rest — `gap-1.5` (6)
 * 31 times, `mt-0.5` (2) 21 times, `py-2.5` (10) 9 times, `p-3.5` (14) 3 times, `pb-10` (40)
 * once — so a mobile `gap: 6` is **on** the scale being matched, not off it. An earlier draft
 * of this guard called those violations and would have had someone "fix" 15 correct values,
 * changing the line spacing inside every card to make a test pass.
 */
const TAILWIND_HALF_STEPS = new Set([2, 6, 10, 14]);
const isTailwindStep = (value: number) => value % 4 === 0 || TAILWIND_HALF_STEPS.has(value);

const SPACING_VALUES = new Set<number>(Object.values(spacing));
const RADII_VALUES = new Set<number>(Object.values(radii));

/** `rounded-full`. React Native has no keyword for it, so a large literal IS the idiom. */
const PILL_RADIUS = 999;

interface Violation {
  file: string;
  line: number;
  key: string;
  value: number;
  nearest: number;
}

const nearestIn = (allowed: Set<number>, value: number) =>
  [...allowed].reduce((best, step) =>
    Math.abs(step - value) < Math.abs(best - value) ? step : best
  );

/** The numeric value of a property, including negatives (`marginTop: -spacing.sm` is fine). */
function numericValue(node: ts.Expression): number | null {
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  ) {
    return -Number(node.operand.text);
  }
  return null;
}

/**
 * A circle: `borderRadius` at exactly half a literal `width`/`height` in the same object.
 * Detected structurally rather than allowlisted, because it is the idiomatic `rounded-full`
 * for a fixed-size dot and there is no other way to write it. `InsightsScreen`'s 10x10 legend
 * dot at `borderRadius: 5` is the case that prompted this — squaring it off by "fixing" it to
 * `radius.sm` was a real risk once a guard existed.
 */
function isHalfOfASquareSide(object: ts.ObjectLiteralExpression, radius: number): boolean {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;
    if (property.name.text !== 'width' && property.name.text !== 'height') continue;
    const side = numericValue(property.initializer);
    if (side !== null && side === radius * 2) return true;
  }
  return false;
}

function collectViolations(sourceFile: ts.SourceFile, relative: string): Violation[] {
  const found: Violation[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;
        const key = property.name.text;
        const value = numericValue(property.initializer);
        if (value === null || value === 0) continue;

        const magnitude = Math.abs(value);
        const isSpacing = SPACING_KEY.test(key) || GAP_KEY.test(key);
        const isRadius = key === 'borderRadius';
        if (!isSpacing && !isRadius) continue;

        if (isRadius && (magnitude === PILL_RADIUS || isHalfOfASquareSide(node, magnitude))) {
          continue;
        }

        const allowed = isSpacing ? SPACING_VALUES : RADII_VALUES;
        if (allowed.has(magnitude)) continue;
        // Spacing additionally accepts any Tailwind step, named here or not. A radius does
        // not: the radius scale is five specific values derived from `--radius`, and a corner
        // that is merely a multiple of 4 is drift.
        if (isSpacing && isTailwindStep(magnitude)) continue;

        const { line } = sourceFile.getLineAndCharacterOfPosition(property.getStart(sourceFile));
        found.push({
          file: relative,
          line: line + 1,
          key,
          value,
          nearest: nearestIn(allowed, magnitude),
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

describe('spacing and radii come from the scale', () => {
  it('has no off-scale numeric literal', () => {
    const violations: Violation[] = [];

    for (const file of collectSourceFiles(SRC_ROOT, /\.tsx?$/)) {
      const relative = path.relative(SRC_ROOT, file);
      if (relative.includes('__tests__')) continue;
      violations.push(...collectViolations(parseSourceFile(file), relative));
    }

    const report = violations.map(
      (v) =>
        `${v.file}:${v.line} — ${v.key}: ${v.value} is not on the scale (nearest step ${v.nearest}). ` +
        `Use spacing/radii from '@trackvibe/shared/tokens'.`
    );

    expect(report).toEqual([]);
  });
});

describe('what the guard does and does not consider a violation', () => {
  const check = (literal: string) => {
    const source = ts.createSourceFile(
      'sample.tsx',
      `const s = ${literal};`,
      ts.ScriptTarget.Latest,
      true
    );
    return collectViolations(source, 'sample.tsx');
  };

  it.each([
    ['an arbitrary padding', `{ a: { padding: 7 } }`],
    ['an arbitrary gap', `{ a: { gap: 9 } }`],
    ['a radius that is merely a multiple of 4', `{ a: { borderRadius: 8 } }`],
    ['a key React Native added later', `{ a: { paddingStart: 5 } }`],
  ])('flags %s', (_label, literal) => {
    expect(check(literal)).not.toEqual([]);
  });

  it.each([
    ['a named step', `{ a: { padding: 16 } }`],
    ['a Tailwind half-step the web uses 31 times', `{ a: { gap: 6 } }`],
    ['a negative offset built from the scale', `{ a: { marginTop: -12 } }`],
    ['zero', `{ a: { padding: 0 } }`],
    ['a pill', `{ a: { borderRadius: 999 } }`],
    ['a circle, detected from its own width', `{ a: { width: 10, height: 10, borderRadius: 5 } }`],
    ['a card radius', `{ a: { borderRadius: 22 } }`],
  ])('accepts %s', (_label, literal) => {
    expect(check(literal)).toEqual([]);
  });

  it('names the file, line, value and nearest step', () => {
    // An error that just says "off-scale" sends the reader hunting; this is the difference
    // between a guard people fix and a guard people delete.
    const [violation] = check(`{ a: { padding: 7 } }`);
    expect(violation).toMatchObject({ key: 'padding', value: 7, nearest: 8, line: 1 });
  });
});
