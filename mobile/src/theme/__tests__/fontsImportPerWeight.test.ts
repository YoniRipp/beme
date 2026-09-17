import fs from 'fs';
import path from 'path';
import {
  SRC_ROOT,
  collectSourceFiles,
  parseSourceFile,
  collectImports,
  collectRequireCalls,
} from '../paletteGuardSupport';

/**
 * A font weight is imported from its own directory, never from the package root.
 *
 * `@expo-google-fonts/inter/index.js` is a generated barrel that `require()`s all eighteen
 * Inter weights unconditionally, and Metro cannot tree-shake a `require` of an asset — an
 * asset reached by any path is an asset in the binary. So
 * `import { Inter_400Regular } from '@expo-google-fonts/inter'` ships every weight and every
 * italic, whether one face is named or six.
 *
 * Measured with `npx expo export --platform ios` on 2026-09-17: **36 font files, 7.65 MB**,
 * of which six faces and 1.52 MB were used. Switching to `@expo-google-fonts/inter/400Regular`
 * and friends took the export from 13 MB to 7.1 MB with an identical 4.3 MB JS bundle.
 *
 * Nothing catches this. It typechecks, every test passes, the app renders correctly, and the
 * only symptom is six megabytes in a binary nobody weighs — which is why it survived from
 * before #343, when only two faces were loaded and the waste was already 34 files.
 *
 * **This guard scans the app root, not just `src/`.** `App.tsx` is where fonts are registered
 * and it sits outside `SRC_ROOT`, so a guard anchored at `src/` would pass while inspecting
 * nothing — exactly the blind spot `rawTextNamesItsFont` had over React Navigation's style
 * props, one layer further out.
 */

/** `mobile/` — one level above `src`, so `App.tsx` and any future top-level entry is covered. */
const APP_ROOT = path.join(SRC_ROOT, '..');

/** A bare `@expo-google-fonts/<family>` with no weight directory after it. */
const FONT_PACKAGE_ROOT = /^@expo-google-fonts\/[^/]+$/;

function appSourceFiles(): string[] {
  const files = collectSourceFiles(SRC_ROOT, /\.(ts|tsx)$/);
  for (const entry of fs.readdirSync(APP_ROOT, { withFileTypes: true })) {
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      files.push(path.join(APP_ROOT, entry.name));
    }
  }
  return files;
}

describe('font imports', () => {
  it('names a weight directory rather than the package root', () => {
    const offenders: string[] = [];

    for (const file of appSourceFiles()) {
      const sourceFile = parseSourceFile(file);
      const specifiers = [
        ...collectImports(sourceFile).map((i) => i.moduleSpecifier),
        ...collectRequireCalls(sourceFile),
      ];
      for (const specifier of specifiers) {
        if (FONT_PACKAGE_ROOT.test(specifier)) {
          offenders.push(`${path.relative(APP_ROOT, file)} -> ${specifier}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  /**
   * The guard above keys on a path shape, so it would report success having inspected
   * nothing if the file list ever came back empty or lost `App.tsx`. Anchor it on the file
   * that actually registers the fonts.
   */
  it('inspects App.tsx, which is where the fonts are registered', () => {
    const files = appSourceFiles().map((f) => path.relative(APP_ROOT, f));

    expect(files).toContain('App.tsx');
    expect(files.length).toBeGreaterThan(50);
  });
});
