import path from 'path';
import ts from 'typescript';
import {
  SRC_ROOT,
  collectSourceFiles,
  parseSourceFile,
  collectImports,
  collectRequireCalls,
  collectHexColorLiterals,
  collectJsxElementNames,
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

/**
 * `paperTheme`/`paperDarkTheme` are in here alongside the three palettes because they are
 * the same hazard one layer up. `theme.ts` builds both at module load from the STATIC
 * palettes, so each is frozen to the default accent — `useAppTheme` is the only thing
 * that resolves the user's choice, and it calls `buildPaperTheme` directly rather than
 * touching either export. Nothing imports them today, which is exactly when to add the
 * name: this PR just widened what a stray import of one would freeze from nine baked
 * roles to thirty-three, so the first `import { paperTheme }` would pin a whole MD3
 * theme to light mode and the default green.
 */
const FROZEN_PALETTE_NAMES = new Set([
  'colors',
  'lightColors',
  'darkColors',
  'paperTheme',
  'paperDarkTheme',
]);

/**
 * AN ALLOWLIST ENTRY IS A CLAIM ABOUT THE CODEBASE, NOT A NOTE. A claim nothing
 * re-evaluates is a comment, and a guard whose exemptions are comments goes green through
 * the change that invalidates them.
 *
 * That is not hypothetical here. `ProgressRing.tsx`'s `#e5e7eb` was exempted because
 * "the component has no current call sites (`\"<ProgressRing\"` greps empty), so it is
 * not a live dark-mode defect today". True when written. PR #303 gave the component its
 * first call site — a weekly goal ring on `BodyScreen`, inside a card whose background is
 * `colors.surface`, in the theme that ships as the default — and the hex became a
 * 14.44:1 light-grey hoop on a near-black card. This guard stayed green through exactly
 * that transition, because nothing re-checked the sentence it was resting on.
 *
 * So an entry may carry a `condition` that IS re-checked, and the ones that can be
 * checked must be. `unusedComponent` is the shape that has already bitten: it asserts
 * "no JSX in `mobile/src` renders this component", and the moment one does, the exemption
 * fails — reported as an expired justification rather than as a disallowed hex, because
 * the author needs to know the reasoning died, not just see the symptom.
 *
 * Free text stays available, and stays correct, for exemptions that are genuinely not
 * mechanically checkable: `lib/analytics.ts`'s categorical chart colours are not a themed
 * role in any theme and never will be. The distinction is whether the reason makes a claim
 * that could stop being true.
 *
 * There are ZERO `unusedComponent` entries below, and that is the intended end state, not
 * an oversight — the one that existed expired and was fixed. The mechanism is here so the
 * NEXT one expires loudly; it is pinned by a fixture case (see the bottom of this file)
 * for the same reason the two import-regex holes are.
 *
 * file (relative to `mobile/src`) -> hex value -> the exemption. Kept per-(file, value)
 * rather than a whole-file skip, so the rest of an allowlisted file is still checked.
 */
interface HexExemption {
  reason: string;
  /**
   * Mechanically re-checked: the exemption holds only while NO file under `mobile/src`
   * renders this component in JSX. Use it whenever the reason is "nothing uses this yet".
   * Tests don't count as call sites — `collectSourceFiles` skips `__tests__` — which is
   * the right reading: a rendered-in-a-test component is not on anyone's screen.
   */
  unusedComponent?: string;
}

const ALLOWED_HEX_LITERALS: Record<string, Record<string, HexExemption>> = {
  [path.join('lib', 'analytics.ts')]: {
    '#10b981': { reason: 'CHART_COLORS — react-native-gifted-charts needs literal values; chart series colours are categorical, not a themed role' },
    '#3b82f6': { reason: 'CHART_COLORS — categorical chart series colour' },
    '#8b5cf6': { reason: 'CHART_COLORS — categorical chart series colour' },
    '#f59e0b': { reason: 'CHART_COLORS — categorical chart series colour' },
    '#ef4444': { reason: 'CHART_COLORS — categorical chart series colour' },
  },
  [path.join('screens', 'InsightsScreen.tsx')]: {
    '#fff': { reason: "PieChart label text drawn on the chart's own coloured wedge fills, not the page background — legible regardless of app theme" },
    '#ef4444': { reason: 'LineChart series colour (calorie trend) — categorical chart accent, same class as CHART_COLORS' },
  },
};

/**
 * The re-evaluation itself, as a pure function of (allowlist, components rendered
 * somewhere in the tree) so the fixture case at the bottom can drive it with a synthetic
 * allowlist. Returns one message per exemption whose stated justification has stopped
 * being true.
 */
function expiredExemptions(
  allowlist: Record<string, Record<string, HexExemption>>,
  renderedComponents: Set<string>
): string[] {
  const expired: string[] = [];
  for (const [file, byHex] of Object.entries(allowlist)) {
    for (const [hex, exemption] of Object.entries(byHex)) {
      const component = exemption.unusedComponent;
      if (component && renderedComponents.has(component)) {
        expired.push(
          `mobile/src/${file}: the exemption for '${hex}' has EXPIRED. It was allowed on the ` +
            `grounds that \`${component}\` has no call sites, and something under mobile/src now ` +
            `renders \`<${component}>\`. The hex is not newly wrong — the reasoning that made it ` +
            `acceptable is. Either theme the colour (\`useThemedStyles\` / \`useThemeContext\`) ` +
            `and delete this entry, or replace the entry's reason with one that is true now.`
        );
      }
    }
  }
  return expired;
}

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

  it('does not let an allowlist entry outlive the justification it was granted on', () => {
    const files = collectSourceFiles(SRC_ROOT, /\.tsx?$/);
    const rendered = new Set(files.flatMap((file) => collectJsxElementNames(parseSourceFile(file))));
    const expired = expiredExemptions(ALLOWED_HEX_LITERALS, rendered);

    if (expired.length > 0) {
      throw new Error(
        `${expired.length} hex-literal exemption(s) rest on a claim that is no longer true:\n` +
          expired.map((e) => `  - ${e}`).join('\n')
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

  /**
   * Pins the expiry mechanism itself. `ALLOWED_HEX_LITERALS` has no `unusedComponent`
   * entries any more — the one that did expired, was found, and was fixed — so the live
   * check above passes vacuously today and would keep passing if the whole mechanism were
   * deleted. These fixtures are what make it real for the next entry.
   */
  describe('the allowlist-expiry mechanism', () => {
    const parseFixture = (text: string): ts.SourceFile =>
      ts.createSourceFile('fixture.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const fixtureAllowlist = {
      [path.join('components', 'Widget.tsx')]: {
        '#e5e7eb': { reason: 'no call sites yet', unusedComponent: 'Widget' },
      },
    };

    it('reports an exemption as expired once something renders the component', () => {
      const expired = expiredExemptions(fixtureAllowlist, new Set(['Widget']));

      expect(expired).toHaveLength(1);
      // The message has to name the justification, not the symptom: an author who reads
      // "hex not allowed" goes looking for what changed about the colour, and nothing did.
      expect(expired[0]).toMatch(/EXPIRED/);
      expect(expired[0]).toMatch(/no call sites/);
      expect(expired[0]).toMatch(/<Widget>/);
    });

    it('leaves the exemption alone while the component really is unused', () => {
      expect(expiredExemptions(fixtureAllowlist, new Set(['SomethingElse']))).toEqual([]);
    });

    it('never expires a free-text exemption, which makes no checkable claim', () => {
      const freeText = {
        [path.join('lib', 'analytics.ts')]: { '#10b981': { reason: 'categorical chart series colour' } },
      };
      // Even with every name in the tree rendered, an entry with no condition stands.
      expect(expiredExemptions(freeText, new Set(['analytics', 'CHART_COLORS', 'Widget']))).toEqual([]);
    });

    it('counts a real JSX usage and not a mention of the name in prose or a string', () => {
      // The grep the original justification cited (`"<ProgressRing"`) could not tell these
      // apart, which is half of why a sentence in a comment was doing a guard's job.
      const rendered = new Set(
        collectJsxElementNames(
          parseFixture(
            `// Widget is not used here.\nconst label = '<Widget>';\nexport const A = () => <Other />;\n`
          )
        )
      );
      expect(rendered.has('Widget')).toBe(false);
      expect(expiredExemptions(fixtureAllowlist, rendered)).toEqual([]);

      const used = new Set(
        collectJsxElementNames(parseFixture(`export const B = () => <Widget value={1} />;\n`))
      );
      expect(used.has('Widget')).toBe(true);
      expect(expiredExemptions(fixtureAllowlist, used)).toHaveLength(1);
    });

    it('sees a component rendered with children, and one reached through a namespace', () => {
      const withChildren = new Set(
        collectJsxElementNames(parseFixture(`export const C = () => <Widget><Text /></Widget>;\n`))
      );
      expect(withChildren.has('Widget')).toBe(true);

      const namespaced = new Set(
        collectJsxElementNames(parseFixture(`export const D = () => <Widget.Ring value={1} />;\n`))
      );
      expect(namespaced.has('Widget')).toBe(true);
    });
  });
});
