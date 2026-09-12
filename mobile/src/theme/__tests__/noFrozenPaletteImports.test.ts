import fs from 'fs';
import path from 'path';

/**
 * `StyleSheet.create` runs exactly once, at module load. A module that imports the
 * *static* `colors` export from `../theme` (or `../../theme`, etc — see
 * `mobile/src/theme.ts`, which re-exports `@trackvibe/shared/tokens`'s `colors`, always
 * `lightColors`) and uses it for anything it renders has therefore frozen whatever
 * `colors.x` resolved to at import time. Dark mode, and the user's accent-colour
 * choice, can never reach a file like that no matter what `ThemeProvider` resolves at
 * runtime — this was true of every screen and shared card component before this task,
 * which moved all of them onto `useThemeContext()` / `useThemedStyles()` instead, which
 * read the *resolved* palette on every render.
 *
 * This test is the guard against that regressing: it scans every source file under
 * `mobile/src` (except `theme.ts` itself, see `ALLOWED_FILES` below) and fails —
 * naming the file — if any of them import the bare `colors` binding from a relative
 * `theme` module. After this task, the only place that binding is still *imported*
 * under `mobile/src` is nowhere: `theme.ts` is where it's defined, and
 * `theme/useAppTheme.ts` / `theme/useThemedStyles.ts` — the two places allowed to
 * build the resolved palette — import `lightColors`/`darkColors`/`ColorRoles`, never
 * the frozen `colors` alias.
 *
 * Deliberately a plain source scan, not a TypeScript/AST check: a new screen or card
 * that types `import { colors, spacing } from '../theme'` (or copies an old one that
 * still did) is exactly the mistake this exists to catch, and grep-shaped text is
 * enough to catch grep-shaped text. The cost of that plainness: it can't tell code
 * from comments either, which is exactly why `theme.ts` needs the explicit allowlist
 * below — its own docblock *quotes* the old `import { colors, ... } from '../theme'`
 * pattern as an example of what it keeps working, which reads to this regex exactly
 * like an offending import.
 */

const SRC_ROOT = path.join(__dirname, '..', '..');

// `theme.ts` re-exports the real `colors` (from `@trackvibe/shared/tokens`) — that's
// an `export`, which `STATIC_COLORS_IMPORT` doesn't match — but its docblock also
// *quotes* `import { colors, spacing, radius } from '../theme'` as prose, which this
// plain-text regex can't distinguish from a real one. Skip the one file that's
// expected to talk about the pattern rather than commit it.
const ALLOWED_FILES = new Set([path.join(SRC_ROOT, 'theme.ts')]);

// Matches `import { ..., colors, ... } from '<some number of ../ segments>theme'`,
// regardless of how many other names are imported alongside it or what order they're
// in. Does not match `export { ... colors ... }` (theme.ts's own re-export) or a
// type-only import of an unrelated name (e.g. `import type { ColorRoles } from
// '@trackvibe/shared/tokens'`), since neither the keyword nor the module specifier
// matches.
const STATIC_COLORS_IMPORT = /import\s*\{[^}]*\bcolors\b[^}]*\}\s*from\s*['"](?:\.\.?\/)+theme['"]/;

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('static colour palette guard', () => {
  it('does not let any module under mobile/src import the frozen `colors` export from `theme`', () => {
    const offenders = collectSourceFiles(SRC_ROOT)
      .filter((file) => !ALLOWED_FILES.has(file))
      .filter((file) => STATIC_COLORS_IMPORT.test(fs.readFileSync(file, 'utf8')));

    if (offenders.length > 0) {
      const names = offenders.map((f) => path.relative(SRC_ROOT, f));
      throw new Error(
        `${names.length} file(s) import the static, always-light \`colors\` export ` +
          `from a relative 'theme' module instead of reading the live theme:\n` +
          names.map((n) => `  - mobile/src/${n}`).join('\n') +
          `\n\nThis freezes whatever \`colors.x\` resolved to at import time, so dark ` +
          `mode (and the user's accent-colour choice) can never reach these files, no ` +
          `matter what ThemeProvider resolves at runtime.\n\n` +
          `Fix: inside the component, use \`const { colors } = useThemeContext();\` for ` +
          `one-off colour values, and \`const styles = useThemedStyles((colors) => ({ ` +
          `... }));\` (mobile/src/theme/useThemedStyles.ts) in place of a module-scope ` +
          `\`StyleSheet.create\` that reads \`colors\`.`
      );
    }
  });
});
