import path from 'path';
import ts from 'typescript';
import { SRC_ROOT, collectSourceFiles, parseSourceFile, collectImports } from '../paletteGuardSupport';

/**
 * Paper's MD3 typescale carries the app's fonts (`buildPaperTheme` in `mobile/src/theme.ts`),
 * but it only reaches Paper's own `<Text>`. A file that renders react-native's raw `<Text>`
 * gets the system face unless its style names a `fontFamily` itself.
 *
 * This is not hypothetical. Task 5 loaded Fraunces + Inter, wired them into Paper, and
 * shipped 17 green tests — and the app still rendered its sign-in screen in the system font,
 * because `LoginScreen`, `SignupScreen` and `RootNavigator`'s loading screen are built from
 * raw react-native primitives. Those three are the ONLY screens a signed-out user sees, so
 * the one surface the fonts visibly missed was the first impression.
 *
 * The invariant this guards: if a file imports `Text` from 'react-native', it must also
 * import a binding literally named `fonts` (from the theme). That is not proof every style
 * names a face, but it fails loudly on the actual mistake — adding a raw-`Text` screen and
 * never thinking about the font at all.
 *
 * REWRITTEN from a plain-text regex scan to AST parsing (see `paletteGuardSupport.ts`'s own
 * docblock). The regex version had two confirmed holes:
 *   1. Its import match was single-quote only (`from\s*'react-native'`), so
 *      `from "react-native"` was invisible to it. No linter in this repo enforces quote
 *      style, so this was a live gap, not a hypothetical one.
 *   2. Its "imports fonts" check was `/\bfonts\b/.test(src)` — the literal word ANYWHERE in
 *      the file, comments included. A file with raw `<Text>` and a comment reading
 *      `// fonts are handled by Paper elsewhere` satisfied it without a real import.
 * Parsing sidesteps both: `node.moduleSpecifier.text` is quote-agnostic, and the "imports
 * fonts" check now walks real `ImportDeclaration` named-binding nodes — a comment is not one.
 *
 * A file that legitimately renders no text of its own can be added to ALLOWED_FILES with a
 * reason.
 */
const ALLOWED_FILES: Record<string, string> = {};

describe('raw react-native <Text> names its font', () => {
  it('every file rendering raw Text also imports `fonts` from the theme', () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(SRC_ROOT, /\.tsx$/)) {
      const rel = path.relative(SRC_ROOT, file);
      if (rel in ALLOWED_FILES) continue;

      const sourceFile = parseSourceFile(file);
      const imports = collectImports(sourceFile);

      const usesRawText = imports.some(
        (imp) => imp.moduleSpecifier === 'react-native' && imp.namedImports.includes('Text')
      );
      if (!usesRawText) continue;

      const importsFonts = imports.some((imp) => imp.namedImports.includes('fonts'));
      if (!importsFonts) {
        offenders.push(
          `${rel} renders react-native's raw <Text> but never imports \`fonts\` — it will ` +
          `render in the system face, not Inter/Fraunces. Add \`fontFamily: fonts.regular\` ` +
          `(or fonts.display for a heading) to its text styles.`
        );
      }
    }

    expect(offenders).toEqual([]);
  });

  // Regression coverage for the two confirmed holes in the old regex-based version. These
  // parse fixture source text directly rather than touching the filesystem, so they pin the
  // AST-level behaviour independent of whatever real files exist under mobile/src today.
  describe('closes the two confirmed regex holes', () => {
    const parseFixture = (text: string): ts.SourceFile =>
      ts.createSourceFile('fixture.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    it('detects a raw Text import written with double quotes', () => {
      const src = `import { Text } from "react-native";\nexport const X = () => <Text>hi</Text>;\n`;
      const imports = collectImports(parseFixture(src));
      const usesRawText = imports.some(
        (imp) => imp.moduleSpecifier === 'react-native' && imp.namedImports.includes('Text')
      );
      expect(usesRawText).toBe(true);
    });

    it('does not accept a comment mentioning "fonts" as importing the `fonts` binding', () => {
      const src =
        `// fonts are handled by Paper elsewhere\n` +
        `import { Text, View } from 'react-native';\n` +
        `export const X = () => <View><Text>hi</Text></View>;\n`;
      const imports = collectImports(parseFixture(src));
      const importsFonts = imports.some((imp) => imp.namedImports.includes('fonts'));
      expect(importsFonts).toBe(false);
    });
  });
});

/**
 * The blind spot the guard above has by construction.
 *
 * Its trigger is "this file imports `Text` from 'react-native'". React Navigation's text
 * lives in style props — `tabBarLabelStyle`, `headerTitleStyle` — that never pass through a
 * `<Text>` import at all, so `MainTabs.tsx` was exempt from the check while rendering the six
 * tab labels and every screen header in the platform's system face. That is the most-seen
 * text in the app, and it is the same class of miss the guard above was written for, one
 * layer over: three green font tests, and the font still not on screen.
 */
const NAVIGATION_TEXT_STYLE_PROPS = new Set([
  'tabBarLabelStyle',
  'headerTitleStyle',
  'headerBackTitleStyle',
  'tabBarBadgeStyle',
]);

/** Object literals assigned to a navigation text-style prop, with whether they name a face. */
function navigationTextStyles(sourceFile: ts.SourceFile) {
  const found: { prop: string; line: number; namesFont: boolean }[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      NAVIGATION_TEXT_STYLE_PROPS.has(node.name.text) &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      const namesFont = node.initializer.properties.some(
        (property) =>
          ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.name) &&
          property.name.text === 'fontFamily'
      );
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      found.push({ prop: node.name.text, line: line + 1, namesFont });
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

describe('react navigation text names its font', () => {
  it('every navigation text style sets a fontFamily', () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(SRC_ROOT, /\.tsx$/)) {
      const rel = path.relative(SRC_ROOT, file);
      for (const style of navigationTextStyles(parseSourceFile(file))) {
        if (!style.namesFont) offenders.push(`${rel}:${style.line} — ${style.prop}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('actually finds the styles it is checking', () => {
    // Without this, a typo in NAVIGATION_TEXT_STYLE_PROPS would leave the check above green
    // and empty forever — which is precisely how the tab bar went unnoticed.
    const seen = collectSourceFiles(SRC_ROOT, /\.tsx$/).flatMap((file) =>
      navigationTextStyles(parseSourceFile(file))
    );

    expect(seen.length).toBeGreaterThanOrEqual(3);
    expect(seen.map((s) => s.prop)).toEqual(
      expect.arrayContaining(['tabBarLabelStyle', 'headerTitleStyle'])
    );
  });

  it('flags a navigation style that omits the font', () => {
    const source = ts.createSourceFile(
      'sample.tsx',
      `const o = { headerTitleStyle: { fontSize: 18, color: 'x' } };`,
      ts.ScriptTarget.Latest,
      true
    );

    expect(navigationTextStyles(source)).toEqual([
      { prop: 'headerTitleStyle', line: 1, namesFont: false },
    ]);
  });
});

/**
 * Naming a font is not the same as naming the right one.
 *
 * `LoginScreen`'s sign-in button carried `fontFamily: fonts.regular` beside
 * `fontWeight: '600'`. Both guards above were green on that file — it imports `fonts`, and it
 * is not a navigator — and the button still rendered at 400, because on Expo the weight is
 * part of the family name and `Inter_400Regular` has no 600 in it to reach.
 *
 * That is the subtler half of the same bug, and the one that survives a fix for the other
 * half: someone adds `fontFamily` to satisfy a guard, picks `fonts.regular` because it is the
 * first one in the list, and the text renders exactly as wrong as before with every test
 * green.
 */
const WEIGHT_FOR_FACE: Record<string, string[]> = {
  regular: ['400'],
  medium: ['500'],
  semibold: ['600'],
  // 800 included deliberately: the web's `font-extrabold` has no face, so it maps here.
  bold: ['700', '800'],
  display: ['500'],
  displaySemibold: ['600'],
};

/** Style objects that name both a `fonts.*` face and a numeric weight, and whether they agree. */
function faceWeightPairs(sourceFile: ts.SourceFile) {
  const pairs: { face: string; weight: string; line: number; agrees: boolean }[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node)) {
      let face: string | undefined;
      let weight: string | undefined;
      let line = 0;

      for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;
        const key = property.name.text;
        const value = property.initializer;

        if (
          key === 'fontFamily' &&
          ts.isPropertyAccessExpression(value) &&
          ts.isIdentifier(value.expression) &&
          value.expression.text === 'fonts'
        ) {
          face = value.name.text;
          line = sourceFile.getLineAndCharacterOfPosition(property.getStart(sourceFile)).line + 1;
        }
        if (key === 'fontWeight' && ts.isStringLiteral(value)) weight = value.text;
      }

      if (face && weight) {
        pairs.push({ face, weight, line, agrees: (WEIGHT_FOR_FACE[face] ?? []).includes(weight) });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return pairs;
}

describe('a named face matches the weight beside it', () => {
  it('has no style whose family and weight disagree', () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(SRC_ROOT, /\.tsx?$/)) {
      const rel = path.relative(SRC_ROOT, file);
      if (rel.includes('__tests__')) continue;
      for (const pair of faceWeightPairs(parseSourceFile(file))) {
        if (!pair.agrees) {
          offenders.push(
            `${rel}:${pair.line} — fonts.${pair.face} beside fontWeight '${pair.weight}'`
          );
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('is actually looking at real pairs', () => {
    const seen = collectSourceFiles(SRC_ROOT, /\.tsx?$/)
      .filter((f) => !f.includes('__tests__'))
      .flatMap((f) => faceWeightPairs(parseSourceFile(f)));

    // An empty check is a green check. There are dozens of these in the app.
    expect(seen.length).toBeGreaterThan(20);
  });

  it('has no weight standing on its own, with no family at all', () => {
    // The pair check above is silent on a style that names a weight and NO family — which is
    // the original bug in its purest form, and what 52 declarations looked like.
    const offenders: string[] = [];

    for (const file of collectSourceFiles(SRC_ROOT, /\.tsx?$/)) {
      const rel = path.relative(SRC_ROOT, file);
      if (rel.includes('__tests__')) continue;
      const sourceFile = parseSourceFile(file);

      const visit = (node: ts.Node) => {
        if (ts.isObjectLiteralExpression(node)) {
          let weightLine: number | null = null;
          let namesFamily = false;
          for (const property of node.properties) {
            if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;
            if (property.name.text === 'fontWeight') {
              weightLine =
                sourceFile.getLineAndCharacterOfPosition(property.getStart(sourceFile)).line + 1;
            }
            if (property.name.text === 'fontFamily') namesFamily = true;
          }
          if (weightLine !== null && !namesFamily) {
            offenders.push(`${rel}:${weightLine} — fontWeight with no fontFamily`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }

    expect(offenders).toEqual([]);
  });

  it('flags the exact shape LoginScreen shipped', () => {
    const source = ts.createSourceFile(
      'sample.tsx',
      `const s = { b: { fontFamily: fonts.regular, fontSize: 16, fontWeight: '600' } };`,
      ts.ScriptTarget.Latest,
      true
    );

    expect(faceWeightPairs(source)).toEqual([
      { face: 'regular', weight: '600', line: 1, agrees: false },
    ]);
  });
});
