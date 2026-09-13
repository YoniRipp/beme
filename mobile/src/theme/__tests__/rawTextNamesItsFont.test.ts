import fs from 'fs';
import path from 'path';

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
 * import `fonts` from the theme. That is not proof every style names a face, but it fails
 * loudly on the actual mistake — adding a raw-`Text` screen and never thinking about the
 * font at all.
 *
 * A file that legitimately renders no text of its own can be added to ALLOWED_FILES with a
 * reason. Deliberately a source scan, matching `noFrozenPaletteImports.test.ts`.
 */
const SRC = path.join(__dirname, '..', '..');
const ALLOWED_FILES: Record<string, string> = {};

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sourceFiles(full);
    return e.isFile() && full.endsWith('.tsx') ? [full] : [];
  });
}

const RAW_TEXT_IMPORT = /import\s*\{([^}]*)\}\s*from\s*'react-native'/gs;

describe('raw react-native <Text> names its font', () => {
  it('every file rendering raw Text also imports `fonts` from the theme', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(SRC)) {
      const rel = path.relative(SRC, file);
      if (rel in ALLOWED_FILES) continue;
      const src = fs.readFileSync(file, 'utf8');

      const usesRawText = [...src.matchAll(RAW_TEXT_IMPORT)].some((m) => /\bText\b/.test(m[1]));
      if (!usesRawText) continue;

      if (!/\bfonts\b/.test(src)) {
        offenders.push(
          `${rel} renders react-native's raw <Text> but never imports \`fonts\` — it will ` +
          `render in the system face, not Inter/Fraunces. Add \`fontFamily: fonts.regular\` ` +
          `(or fonts.display for a heading) to its text styles.`
        );
      }
    }

    expect(offenders).toEqual([]);
  });
});
