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
