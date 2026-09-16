import path from 'path';
import ts from 'typescript';
import { SRC_ROOT, collectSourceFiles, parseSourceFile } from '../paletteGuardSupport';

/**
 * Nobody hand-rolls a card again.
 *
 * `MetricCard`, `MobileFoodCard`, `MobileGoalCard` and `MobileWorkoutCard` each carried
 * their own copy of the same three style rules — surface fill, 1px border, a radius — which
 * is four copies of `components/ui/card.tsx` with no `card.tsx`. The web decides that once
 * and 33 call sites inherit it; `agent-os/standards/frontend/components.md` calls the
 * duplicate "a bug".
 *
 * That it kept happening is the point. `SectionCard` was written *after* the spec naming the
 * problem, by an author trying to solve it for Home's five new cards — and it still grew a
 * fifth copy, at `radius.xl` (18) where the other four sat at `radius.lg` (14). A convention
 * that a careful author misses is not a convention, so this is a test rather than a comment.
 *
 * Matching on the **shape** rather than a list of component names, following
 * `collectHexColorLiterals`'s note: the next copy will be in a file nobody has thought of, so
 * the question asked is "does this object look like a card surface", not "is this file on a
 * list". A card surface is a fill from the palette plus a border plus a corner — the three
 * properties `ui/Card` exists to own.
 */

/**
 * The radii a card is drawn at. `md` and below is an input (`input.tsx` is `rounded-md`) and
 * a pill is `999`; both share the other two properties with a card and are not one. Checking
 * the corner is what separates them, and it keeps the guard on shape rather than on a list of
 * component names.
 */
const CARD_RADII = new Set(['lg', 'xl', 'xxl']);

/** The signature of a card surface: a surface fill, a hairline border, a card-sized corner. */
function looksLikeACardSurface(object: ts.ObjectLiteralExpression): boolean {
  let hasSurfaceFill = false;
  let hasBorderWidth = false;
  let hasCardRadius = false;
  let isDashed = false;

  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;
    const key = property.name.text;
    const value = property.initializer;

    // `backgroundColor: colors.surface` — the palette's card fill specifically. A tinted
    // panel (`colors.muted`, a tone) is a different thing and stays allowed.
    if (
      key === 'backgroundColor' &&
      ts.isPropertyAccessExpression(value) &&
      value.name.text === 'surface'
    ) {
      hasSurfaceFill = true;
    }
    if (key === 'borderWidth') hasBorderWidth = true;
    if (
      key === 'borderRadius' &&
      ts.isPropertyAccessExpression(value) &&
      CARD_RADII.has(value.name.text)
    ) {
      hasCardRadius = true;
    }
    // A dashed edge is an affordance, not a raised card — the web draws its dashed
    // "add another" and empty-meal slots that way, with no shadow.
    if (
      key === 'borderStyle' &&
      ts.isStringLiteral(value) &&
      value.text === 'dashed'
    ) {
      isDashed = true;
    }
  }

  return hasSurfaceFill && hasBorderWidth && hasCardRadius && !isDashed;
}

/**
 * Written with a reason each, never a blanket skip.
 *
 * `AddAnotherCard` is the one real exception: it is `rounded-2xl border border-dashed
 * bg-card/35` on the web — a dashed affordance that closes a list, with no shadow. It mirrors
 * the web's own `components/shared/AddAnotherCard.tsx`, not `components/ui/card.tsx`, so it
 * is a Pressable that happens to share two properties with a card rather than a card.
 */
const ALLOWED: Record<string, string> = {
  [path.join('components', 'shared', 'AddAnotherCard.tsx')]:
    'dashed list affordance, mirrors the web shared/AddAnotherCard.tsx, deliberately not a raised card',
};

describe('cards come from the primitive', () => {
  it('has no hand-rolled card surface outside components/ui/', () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(SRC_ROOT, /\.tsx?$/)) {
      const relative = path.relative(SRC_ROOT, file);
      // `ui/` is where the one real definition lives; it is supposed to match.
      if (relative.startsWith(path.join('components', 'ui'))) continue;
      if (ALLOWED[relative]) continue;

      const sourceFile = parseSourceFile(file);
      const visit = (node: ts.Node) => {
        if (ts.isObjectLiteralExpression(node) && looksLikeACardSurface(node)) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          offenders.push(`${relative}:${line + 1}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }

    expect(offenders).toEqual([]);
  });

  it('still recognises the shape it is looking for', () => {
    // Without this, deleting `looksLikeACardSurface`'s body would leave the guard above
    // green forever — the failure mode this repo has shipped four times.
    const source = ts.createSourceFile(
      'sample.tsx',
      `const s = { card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1 } };`,
      ts.ScriptTarget.Latest,
      true
    );

    const found: boolean[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isObjectLiteralExpression(node)) found.push(looksLikeACardSurface(node));
      ts.forEachChild(node, visit);
    };
    visit(source);

    expect(found).toContain(true);
  });

  it.each([
    ['a tinted panel', `{ backgroundColor: colors.muted, borderRadius: radius.lg, borderWidth: 1 }`],
    ['a text input', `{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1 }`],
    ['a pill chip', `{ backgroundColor: colors.surface, borderRadius: 999, borderWidth: 1 }`],
    [
      'a dashed affordance',
      `{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed' }`,
    ],
  ])('does not flag %s', (_label, literal) => {
    // Each of these really exists in this app and really shares two properties with a card.
    // Without these cases the guard would have demanded that inputs and chips become cards.
    const source = ts.createSourceFile('sample.tsx', `const s = ${literal};`, ts.ScriptTarget.Latest, true);

    const found: boolean[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isObjectLiteralExpression(node)) found.push(looksLikeACardSurface(node));
      ts.forEachChild(node, visit);
    };
    visit(source);

    expect(found).not.toContain(true);
  });
});
