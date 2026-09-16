import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';
import type { ColorRoles } from '@trackvibe/shared/tokens';
import { buildPaperTheme, darkColors, lightColors } from '../../theme';

/**
 * Every MD3 colour role must be an explicit decision. None may be inherited from
 * react-native-paper's own defaults.
 *
 * WHY THIS TEST EXISTS AND THE OTHER GUARDS COULD NOT HAVE CAUGHT IT.
 * `buildPaperTheme` mapped nine of Paper's thirty-three colour keys and spread
 * `...base.colors` under them. Its docstring called that deliberate. It was not
 * survivable: `MD3DarkTheme` is generated from `primary40 = #6750A4`, so twenty-four
 * roles were Material purple, six of them on screen — purple text on the lime "Log Food"
 * pill, a purple block behind every SegmentedButtons selection, a purple-grey dialog on a
 * purple wash, a lilac divider.
 *
 * The two AST guards in this directory (`noFrozenPaletteImports`, `rawTextNamesItsFont`)
 * are good tests and structurally cannot find this one. They scan `mobile/src` for
 * something the app's code WROTE — a hex literal, a frozen import, an unfonted `<Text>`.
 * This bug is the ABSENCE of a write. There is no offending token anywhere in
 * `mobile/src`; the offending values live in
 * `node_modules/react-native-paper/.../v3/tokens.js`, which `collectSourceFiles` skips by
 * design. The only place the defect is observable is the BUILT OBJECT, which is what this
 * asserts over — the same "test what is resolved, not what was intended" reasoning
 * `useAppTheme.test.tsx`'s docblock argues for, applied one layer out.
 *
 * Two assertions, because either alone has a hole:
 *
 *   1. Every role differs from Paper's base value. Catches an unmapped role directly, and
 *      catches a role Paper ADDS in a future minor — which is the point: a new MD3 role is
 *      a new decision, not a default to inherit silently.
 *   2. Every role traces back to a value in the `ColorRoles` palette it was handed
 *      (optionally at partial alpha). Catches a role "mapped" to some other invented
 *      colour, which (1) would happily accept.
 *
 * Comparison is by resolved colour, not by string. Paper spells black
 * `'rgba(0, 0, 0, 1)'` and this palette spells it `'#000000'`; a string compare would call
 * those different and let an inherited role pass on a formatting difference alone.
 */

type Scheme = 'light' | 'dark';

interface Case {
  scheme: Scheme;
  base: MD3Theme;
  palette: ColorRoles;
}

const CASES: Case[] = [
  { scheme: 'light', base: MD3LightTheme, palette: lightColors },
  { scheme: 'dark', base: MD3DarkTheme, palette: darkColors },
];

/**
 * Roles allowed to equal Paper's default, with the reason — same shape as
 * `ALLOWED_HEX_LITERALS` in the frozen-palette guard, and kept as short as that one.
 * `schemes` narrows each exemption to the scheme where the coincidence is real, so the
 * other scheme still guards the role.
 */
interface AllowedMatch {
  reason: string;
  schemes: Scheme[];
}

const ALLOWED_MATCHES: Record<string, AllowedMatch> = {
  'elevation.level0': {
    reason:
      "'transparent' is not a colour, it is Paper's \"no surface\" sentinel. Painting it " +
      'would give every flat Surface a background, so the mapping deliberately restates it.',
    schemes: ['light', 'dark'],
  },
  scrim: {
    reason:
      "the app's dark scrim IS pure black (`--scrim: 0 0% 0%`), which is what Paper's " +
      'neutral0 default happens to be. The value is mapped, it just coincides. The LIGHT ' +
      'scheme is not exempt (`--scrim: 20 14% 8%` = #171312), so removing the mapping still ' +
      'fails this test there.',
    schemes: ['dark'],
  },
  shadow: {
    reason:
      "same coincidence as `scrim`: the dark theme's `--shadow-*` steps are all " +
      '`hsl(0 0% 0% / …)`. Light is `hsl(28 20% 20%)` = #3d3229 and is not exempt.',
    schemes: ['dark'],
  },
  onSecondary: {
    reason:
      'the mirror image of the `scrim` case. Both map to `palette.surface`, and the LIGHT ' +
      "theme's card (`--card: 0 0% 100%`) is pure white — which is also what Paper's light " +
      'onSecondary/onError happen to be. Dark is not exempt (surface is #191715 there, ' +
      "against Paper's #332D41), so the mapping is still guarded.",
    schemes: ['light'],
  },
  onError: {
    reason: 'same coincidence as `onSecondary` — `palette.surface` is white in light. Dark guards it.',
    schemes: ['light'],
  },
};

/** `#abc` / `#aabbcc` / `#aabbccdd` / `rgb(r, g, b)` / `rgba(r, g, b, a)` -> a comparable form. */
function normaliseColour(value: string): string {
  const raw = value.trim().toLowerCase();
  if (raw === 'transparent') return 'transparent';

  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(raw);
  if (hexMatch) {
    const digits = hexMatch[1];
    const full =
      digits.length === 3
        ? digits
            .split('')
            .map((c) => c + c)
            .join('') + 'ff'
        : digits.length === 6
          ? digits + 'ff'
          : digits;
    const [r, g, b, a] = [0, 2, 4, 6].map((i) => parseInt(full.slice(i, i + 2), 16));
    return `${r},${g},${b},${(a / 255).toFixed(3)}`;
  }

  const rgbMatch = /^rgba?\(([^)]+)\)$/.exec(raw);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map((p) => parseFloat(p.trim()));
    const [r, g, b] = parts;
    const a = parts.length > 3 ? parts[3] : 1;
    return `${Math.round(r)},${Math.round(g)},${Math.round(b)},${a.toFixed(3)}`;
  }

  // Anything else (a named colour, a gradient, whatever a future Paper introduces) is
  // returned as-is rather than silently treated as equal to something. An unparseable
  // value that differs textually from the base still counts as "mapped"; the
  // traceability assertion below is what will reject it.
  return raw;
}

/** Drops the alpha channel, so `withAlpha(primary, 0.1)` still traces back to `primary`. */
function rgbOnly(value: string): string {
  return normaliseColour(value).split(',').slice(0, 3).join(',');
}

/** Every colour in a Paper theme as `path -> value`, with `elevation.*` flattened in. */
function flattenColours(theme: MD3Theme): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.colors)) {
    if (key === 'elevation' && value && typeof value === 'object') {
      for (const [level, levelValue] of Object.entries(value as Record<string, string>)) {
        out[`elevation.${level}`] = levelValue;
      }
    } else if (typeof value === 'string') {
      out[key] = value;
    }
  }
  return out;
}

function isAllowedToMatch(role: string, scheme: Scheme): boolean {
  return ALLOWED_MATCHES[role]?.schemes.includes(scheme) ?? false;
}

describe.each(CASES)('MD3 role map ($scheme)', ({ scheme, base, palette }) => {
  const built = flattenColours(buildPaperTheme(base, palette));
  const baseColours = flattenColours(base);

  it('maps every role Paper defines — nothing is left inheriting a Material default', () => {
    const inherited = Object.entries(baseColours)
      .filter(([role, baseValue]) => {
        if (isAllowedToMatch(role, scheme)) return false;
        return normaliseColour(built[role] ?? '') === normaliseColour(baseValue);
      })
      .map(
        ([role, baseValue]) =>
          `colors.${role} is still Paper's own '${baseValue}' — ${scheme} theme. Paper's MD3 ` +
          `defaults are generated from primary40 (#6750A4), so an unmapped role is not ` +
          `"unstyled", it is Material purple. Add \`${role}: palette.<role>\` to the colors ` +
          `block in mobile/src/theme.ts (the role-by-role table with each default and its ` +
          `target is in agent-os/specs/2026-09-14-1110-parity-md3-color-roles/shape.md). If ` +
          `the value genuinely has to equal Paper's, add it to ALLOWED_MATCHES here with a ` +
          `reason and the narrowest set of schemes.`
      );

    if (inherited.length > 0) {
      throw new Error(
        `${inherited.length} MD3 role(s) inherit Paper's default:\n` +
          inherited.map((m) => `  - ${m}`).join('\n')
      );
    }
  });

  it('resolves every role to a value from the ColorRoles palette it was handed', () => {
    const paletteRgb = new Map<string, string>();
    for (const [role, value] of Object.entries(palette)) {
      paletteRgb.set(rgbOnly(value), role);
    }

    const untraceable = Object.entries(built)
      .filter(([, value]) => normaliseColour(value) !== 'transparent')
      .filter(([, value]) => !paletteRgb.has(rgbOnly(value)))
      .map(
        ([role, value]) =>
          `colors.${role} = '${value}' (${scheme}) is not any ColorRoles value, at any alpha. ` +
          `Colours belong in packages/shared/src/tokens/colors.ts first and get referenced ` +
          `second — a one-off colour in the theme map is the same bug as a one-off colour in ` +
          `a component, just further from the screen.`
      );

    if (untraceable.length > 0) {
      throw new Error(
        `${untraceable.length} MD3 role(s) resolve to a colour outside the shared palette:\n` +
          untraceable.map((m) => `  - ${m}`).join('\n')
      );
    }
  });

  it('keeps elevation.level0 as the transparent sentinel rather than painting it', () => {
    expect(built['elevation.level0']).toBe('transparent');
  });

  it('flattens all six elevation levels, so none of them can hide from the two checks above', () => {
    // Pins the walker itself: if `flattenColours` ever stopped descending into
    // `elevation`, both assertions above would pass over the five purple tonal levels
    // that were the most visible half of the original bug.
    // `Object.keys(...)).toContain` rather than `toHaveProperty('elevation.level0')` —
    // `toHaveProperty` reads a dot as a path separator, so it would look for a nested
    // `elevation` object that this flattened map deliberately does not have, and fail on
    // a correct result.
    for (const level of ['level0', 'level1', 'level2', 'level3', 'level4', 'level5']) {
      expect(Object.keys(built)).toContain(`elevation.${level}`);
    }
  });
});

/**
 * Fixture coverage for the guard's own logic, the way the two AST guards pin theirs.
 * Without these the assertions above are only as trustworthy as the current mapping
 * happening to be correct — they would read identically if `normaliseColour` returned a
 * constant.
 */
describe('the guard itself', () => {
  it('treats `rgba(0, 0, 0, 1)` and `#000000` as the same colour', () => {
    // The specific case that would otherwise let dark `scrim`/`shadow` claim to be mapped
    // purely because Paper writes black in a different notation.
    expect(normaliseColour('rgba(0, 0, 0, 1)')).toBe(normaliseColour('#000000'));
    expect(normaliseColour('rgb(37, 35, 42)')).toBe(normaliseColour('#25232a'));
    expect(normaliseColour('#ABC')).toBe(normaliseColour('#aabbcc'));
  });

  it('does not treat two different colours as equal', () => {
    expect(normaliseColour('#6750a4')).not.toBe(normaliseColour('#000000'));
    expect(normaliseColour('rgba(0, 0, 0, 0.4)')).not.toBe(normaliseColour('#000000'));
  });

  it('traces a role back through partial alpha, but not to a colour outside the palette', () => {
    // `secondaryContainer` is the accent at 10%; it must still resolve to `primary`.
    expect(rgbOnly('#b5ef571a')).toBe(rgbOnly('#b5ef57'));
    expect(rgbOnly('#6750a4')).not.toBe(rgbOnly('#b5ef57'));
  });

  it('fails a theme whose roles were left at Paper defaults — the pre-fix mapping', () => {
    // The nine-role map this PR replaced, rebuilt here so the guard is pinned against the
    // exact shape it was written to catch. A guard that has never been shown failing is a
    // comment.
    const nineRoleMap: MD3Theme = {
      ...MD3DarkTheme,
      colors: {
        ...MD3DarkTheme.colors,
        primary: darkColors.primary,
        secondary: darkColors.food,
        background: darkColors.background,
        surface: darkColors.surface,
        surfaceVariant: darkColors.surfaceMuted,
        outline: darkColors.border,
        onSurface: darkColors.text,
        onSurfaceVariant: darkColors.textMuted,
        error: darkColors.danger,
      },
    };

    const built = flattenColours(nineRoleMap);
    const inherited = Object.entries(flattenColours(MD3DarkTheme)).filter(
      ([role, baseValue]) =>
        !isAllowedToMatch(role, 'dark') && normaliseColour(built[role]) === normaliseColour(baseValue)
    );

    // The six that were visible on screen, plus the rest of the unmapped set.
    const roles = inherited.map(([role]) => role);
    expect(roles).toEqual(expect.arrayContaining(['onPrimary', 'secondaryContainer', 'onSecondaryContainer', 'backdrop', 'outlineVariant', 'elevation.level1']));
    expect(inherited.length).toBeGreaterThan(20);
  });
});
