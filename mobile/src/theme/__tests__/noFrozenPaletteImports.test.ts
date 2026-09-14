import path from 'path';
import ts from 'typescript';
import {
  SRC_ROOT,
  collectSourceFiles,
  parseSourceFile,
  collectImports,
  collectRequireCalls,
  collectHexColorLiterals,
  isRelativeModule,
} from '../paletteGuardSupport';

/**
 * `StyleSheet.create` runs exactly once, at module load. A module that reaches the
 * *static* light-mode palette — the `colors` alias, or the `lightColors`/`darkColors`
 * exports it's built from (see `mobile/src/theme.ts`, all three re-exporting
 * `@trackvibe/shared/tokens`) — and uses it for anything it renders has therefore frozen
 * whatever it resolved to at import time. Dark mode, and the user's accent-colour choice,
 * can never reach a file like that no matter what `ThemeProvider` resolves at runtime.
 *
 * A file can freeze the palette two ways, and this guards against both:
 *   1. Importing the frozen palette exports (`colors`/`lightColors`/`darkColors`) instead
 *      of reading the resolved theme via `useThemeContext()`/`useThemedStyles()`.
 *   2. Hardcoding a colour literal directly, skipping the palette entirely. A hardcoded
 *      hex is just as frozen as an import of `colors` — it just doesn't even name what it
 *      copied from.
 *
 * REWRITTEN from a plain-text regex scan to AST parsing (see `paletteGuardSupport.ts`'s
 * own docblock for the full rationale). The regex version — `/import\s*\{[^}]*\bcolors\b
 * [^}]*\}\s*from\s*['"](?:\.\.?\/)+theme['"]/` — matched exactly one shape: a named
 * `{ colors }` import. Three ways around it, all confirmed:
 *   - `import * as Theme from '../theme'` then `Theme.colors.text` — no `{ colors }` token
 *     to match.
 *   - `require('../theme')` — not an `import` statement at all.
 *   - `import { lightColors } from '../theme'` used directly in a module-level
 *     `StyleSheet.create` — exactly as frozen as `colors`, but a different identifier the
 *     regex's `\bcolors\b` was never going to match inside "lightColors"/"darkColors".
 * And it caught nothing at all shaped like a hardcoded `backgroundColor: '#fff'` — the
 * mistake that actually let seven whole files ship frozen to light mode (see git history:
 * `noFrozenPaletteImports.test.ts` passed the entire time).
 *
 * `theme.ts` itself no longer needs an allowlist entry: its own docblock used to *quote*
 * the old import pattern as prose, which a text scan couldn't tell from real code. A
 * comment is invisible to the AST, so that false positive is gone on its own. The one
 * import exception that remains real: `theme/useAppTheme.ts` legitimately imports
 * `lightColors`/`darkColors` (never the frozen `colors` alias) as the two base palettes it
 * resolves the active theme from — see ALLOWED_THEME_IMPORTS.
 */

const ALLOWED_THEME_IMPORTS: Record<string, Set<string>> = {
  [path.join('theme', 'useAppTheme.ts')]: new Set(['lightColors', 'darkColors']),
};

const FROZEN_PALETTE_NAMES = new Set(['colors', 'lightColors', 'darkColors']);

/**
 * file (relative to `mobile/src`) -> hex value -> why it's allowed. Kept small and
 * per-(file, value) rather than a whole-file skip, so the rest of an allowlisted file is
 * still checked.
 */
const ALLOWED_HEX_LITERALS: Record<string, Record<string, string>> = {
  [path.join('lib', 'analytics.ts')]: {
    '#10b981': 'CHART_COLORS — react-native-gifted-charts needs literal values; chart series colours are categorical, not a themed role',
    '#3b82f6': 'CHART_COLORS — categorical chart series colour',
    '#8b5cf6': 'CHART_COLORS — categorical chart series colour',
    '#f59e0b': 'CHART_COLORS — categorical chart series colour',
    '#ef4444': 'CHART_COLORS — categorical chart series colour',
  },
  [path.join('screens', 'InsightsScreen.tsx')]: {
    '#fff': "PieChart label text drawn on the chart's own coloured wedge fills, not the page background — legible regardless of app theme",
    '#ef4444': 'LineChart series colour (calorie trend) — categorical chart accent, same class as CHART_COLORS',
  },
};

function scanFileForImportOffenses(file: string): string[] {
  const rel = path.relative(SRC_ROOT, file);
  const allowedNames = ALLOWED_THEME_IMPORTS[rel] ?? new Set<string>();
  const sourceFile = parseSourceFile(file);
  const problems: string[] = [];

  for (const imp of collectImports(sourceFile)) {
    if (!isRelativeModule(imp.moduleSpecifier, 'theme')) continue;
    if (imp.isNamespaceImport) {
      problems.push(
        `imports the whole theme module as a namespace (\`import * as … from '${imp.moduleSpecifier}'\`)` +
          ' — reaches the frozen `colors`/`lightColors`/`darkColors` exports the same as a named import would'
      );
      continue;
    }
    const frozenNamesUsed = imp.namedImports.filter((n) => FROZEN_PALETTE_NAMES.has(n) && !allowedNames.has(n));
    if (frozenNamesUsed.length > 0) {
      problems.push(
        `imports ${frozenNamesUsed.map((n) => `\`${n}\``).join(', ')} from '${imp.moduleSpecifier}' — frozen at module load, never reactive to theme/accent changes`
      );
    }
  }

  for (const spec of collectRequireCalls(sourceFile)) {
    if (isRelativeModule(spec, 'theme')) {
      problems.push(`requires the theme module via \`require('${spec}')\` — still reaches the frozen exports, just via a different syntax than \`import\``);
    }
  }

  return problems.map((p) => `mobile/src/${rel} ${p}`);
}

function scanFileForHexLiterals(file: string): string[] {
  const rel = path.relative(SRC_ROOT, file);
  const allowedForFile = ALLOWED_HEX_LITERALS[rel] ?? {};
  const sourceFile = parseSourceFile(file);

  return collectHexColorLiterals(sourceFile)
    .filter((hit) => !(hit.value in allowedForFile))
    .map(
      (hit) =>
        `mobile/src/${rel}:${hit.line} hardcodes the colour literal '${hit.value}' — this freezes ` +
        `whatever that resolved to at write time in whichever theme it was copied from, so it will ` +
        `not repaint for dark mode or the user's accent-colour choice. Use ` +
        `\`useThemedStyles((colors) => ({ ... }))\` (mobile/src/theme/useThemedStyles.ts) or ` +
        `\`const { colors } = useThemeContext()\` and reference the matching \`colors.*\` role instead.`
    );
}

describe('static colour palette guard', () => {
  it('does not let any module under mobile/src import the frozen colour exports from `theme`, by name, namespace, or require()', () => {
    const files = collectSourceFiles(SRC_ROOT, /\.tsx?$/);
    const offenders = files.flatMap(scanFileForImportOffenses);

    if (offenders.length > 0) {
      throw new Error(
        `${offenders.length} offence(s) reach the frozen, always-light palette exports ` +
          `instead of reading the live theme:\n` +
          offenders.map((o) => `  - ${o}`).join('\n') +
          `\n\nFix: inside the component, use \`const { colors } = useThemeContext();\` for ` +
          `one-off colour values, and \`const styles = useThemedStyles((colors) => ({ ... }));\` ` +
          `in place of a module-scope \`StyleSheet.create\` that reads the static palette.`
      );
    }
  });

  it('does not let any module under mobile/src hardcode a colour literal outside the documented allowlist', () => {
    const files = collectSourceFiles(SRC_ROOT, /\.tsx?$/);
    const offenders = files.flatMap(scanFileForHexLiterals);

    if (offenders.length > 0) {
      throw new Error(
        `${offenders.length} hardcoded colour literal(s) found:\n` + offenders.map((o) => `  - ${o}`).join('\n')
      );
    }
  });

  // Regression coverage for the two import-shaped evasions the old regex missed. These
  // parse fixture source text directly rather than touching the filesystem, so they pin
  // the AST-level behaviour independent of whatever real files exist under mobile/src
  // today.
  describe('closes the two confirmed import-regex holes', () => {
    const parseFixture = (text: string): ts.SourceFile =>
      ts.createSourceFile('fixture.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    it('detects a namespace import of the theme module', () => {
      const src = `import * as Theme from '../theme';\nconst s = { color: Theme.colors.text };\n`;
      const sourceFile = parseFixture(src);
      const flagged = collectImports(sourceFile).some(
        (imp) => isRelativeModule(imp.moduleSpecifier, 'theme') && imp.isNamespaceImport
      );
      expect(flagged).toBe(true);
    });

    it('detects `lightColors` imported directly, not just the `colors` alias', () => {
      const src = `import { lightColors } from '../theme';\nconst s = { color: lightColors.text };\n`;
      const sourceFile = parseFixture(src);
      const flagged = collectImports(sourceFile).some(
        (imp) =>
          isRelativeModule(imp.moduleSpecifier, 'theme') &&
          imp.namedImports.some((n) => FROZEN_PALETTE_NAMES.has(n))
      );
      expect(flagged).toBe(true);
    });

    it('detects require() of the theme module', () => {
      const src = `const { colors } = require('../theme');\n`;
      const sourceFile = parseFixture(src);
      const flagged = collectRequireCalls(sourceFile).some((spec) => isRelativeModule(spec, 'theme'));
      expect(flagged).toBe(true);
    });
  });
});
