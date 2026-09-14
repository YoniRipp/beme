import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accentHex } from '@trackvibe/shared/settings';
import type { BalanceDisplayColor } from '@trackvibe/shared/settings';
import { SETTINGS_STORAGE_KEY, SettingsProvider } from '../../context/SettingsContext';
import { useSettings } from '../../hooks/useSettings';
import { darkColors, lightColors } from '../../theme';
import { useAppTheme } from '../useAppTheme';

// Note `await renderHook(...)`: RNTL 14 made this async, same as `render()` — without
// the await, `result.current` reads before the hook has actually run.
//
// `SettingsProvider` initialises its state with DEFAULT_SETTINGS synchronously, before
// its AsyncStorage read resolves (mobile/src/context/SettingsContext.tsx), so a render
// against empty storage sees DEFAULT_SETTINGS from the very first render — no need to
// wait for the async load to exercise the default-settings case below.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useAppTheme', () => {
  it(
    "THE TRAP: with default settings (theme 'dark', accent 'green'), primary is the web's " +
      "runtime-overridden lime (#b5ef57) — not darkColors.primary's sage (#64c491)",
    async () => {
      const { result } = await renderHook(() => useAppTheme(), { wrapper });

      expect(result.current.scheme).toBe('dark');
      expect(result.current.colors.primary).toBe('#b5ef57');
      expect(result.current.colors.primary).toBe(accentHex.green.darkPrimary);
      // Pin the regression this whole task exists to prevent: reading the base dark
      // palette's own `primary` gives sage, the wrong answer for what the live site
      // actually renders.
      expect(result.current.colors.primary).not.toBe(darkColors.primary);
    }
  );

  it('overrides BOTH `primary` and `primaryForeground` — every other role passes through the resolved base palette untouched', async () => {
    const { result } = await renderHook(() => useAppTheme(), { wrapper });

    // This test used to assert only `primary` was overridden — the same wrong belief
    // the docblock stated ("useThemeEffect... never touches any other custom
    // property"). The web actually sets FIVE custom properties together
    // (frontend/src/hooks/useThemeEffect.ts:18-22): `--primary`, `--primary-foreground`,
    // `--sidebar-primary`, `--sidebar-primary-foreground`, `--ring`. Mobile has no
    // sidebar and nothing reads `--ring`, but `--primary-foreground` is the half that
    // makes the accent's own text legible, so it must be overridden here too.
    expect(result.current.colors.primary).toBe(accentHex.green.darkPrimary);
    expect(result.current.colors.primaryForeground).toBe(accentHex.green.darkPrimaryForeground);
    // Pin the same class of regression as the first test above: reading the base dark
    // palette's own `primaryForeground` is the wrong answer for what pairs with the
    // accent-overridden `primary`.
    expect(result.current.colors.primaryForeground).not.toBe(darkColors.primaryForeground);

    const { primary: _primary, primaryForeground: _primaryForeground, ...restOfDark } = darkColors;
    const { primary: _resolvedPrimary, primaryForeground: _resolvedForeground, ...restOfResolved } = result.current.colors;
    expect(restOfResolved).toEqual(restOfDark);
  });

  it("applies the light-mode equivalent of the accent override when settings.theme is 'light'", async () => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme: 'light' }));

    const { result } = await renderHook(() => useAppTheme(), { wrapper });

    // SettingsProvider starts from DEFAULT_SETTINGS and only picks up the stored
    // `theme: 'light'` once its AsyncStorage read resolves — retry until it does.
    await waitFor(() => expect(result.current.scheme).toBe('light'));

    expect(result.current.colors.primary).toBe(accentHex.green.primary);
    // `ACCENT_PALETTE.green.primary` was chosen to already equal the light palette's
    // own default primary (see packages/shared/src/settings/accent.ts), so this is the
    // one case where the override is a no-op — worth pinning explicitly so a future
    // change to either constant is caught here.
    expect(result.current.colors.primary).toBe(lightColors.primary);

    expect(result.current.colors.primaryForeground).toBe(accentHex.green.primaryForeground);
    expect(result.current.colors.primaryForeground).toBe(lightColors.primaryForeground);
  });

  it('builds a react-native-paper theme carrying the same resolved primary', async () => {
    const { result } = await renderHook(() => useAppTheme(), { wrapper });

    expect(result.current.paperTheme.colors.primary).toBe(result.current.colors.primary);
  });
});

// WCAG 2.x relative luminance / contrast ratio — https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
// and https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio. Implemented locally rather than
// imported so these tests have no dependency on any implementation under test. Module
// scope so both contrast blocks below share one implementation.
function srgbChannelToLinear(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * srgbChannelToLinear(r) + 0.7152 * srgbChannelToLinear(g) + 0.0722 * srgbChannelToLinear(b);
}

/** Order-independent WCAG contrast ratio, from 1 (identical) to 21 (black vs white). */
function contrastRatio(hexA: string, hexB: string): number {
  const lighter = Math.max(relativeLuminance(hexA), relativeLuminance(hexB));
  const darker = Math.min(relativeLuminance(hexA), relativeLuminance(hexB));
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Flattens an `#RRGGBBAA` value onto what is behind it, returning opaque `#RRGGBB`.
 *
 * The MD3 container roles are the accent at 10% (`withAlpha`), and a contrast ratio
 * computed against a translucent colour is not a real ratio — it would be measuring a
 * colour nobody can see. What the eye receives is the composite, so composite first.
 * Six-digit input is returned unchanged.
 */
function composite(value: string, behind: string): string {
  if (value.length !== 9) return value;
  const alpha = parseInt(value.slice(7, 9), 16) / 255;
  const channel = (i: number) =>
    Math.round(parseInt(value.slice(i, i + 2), 16) * alpha + parseInt(behind.slice(i, i + 2), 16) * (1 - alpha))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/**
 * The assertion that would have caught the bug this whole task exists to fix. A test
 * that merely checks `primaryForeground` is "set" (e.g. `.toBeDefined()`, or comparing
 * against a hardcoded hex) would not have — `accentHex.*.primaryForeground` /
 * `darkPrimaryForeground` already existed and were already correct (see
 * `packages/shared/src/settings/accent.ts`) the entire time this was broken; the bug was
 * that `useAppTheme` never read them. The only assertion that actually distinguishes
 * "reads the real foreground" from "reads nothing / reads the wrong thing" is a numeric
 * contrast check against whatever `useAppTheme()` ACTUALLY resolves — so this renders the
 * real hook, for every accent, in both schemes, and computes WCAG contrast from whatever
 * hex comes back. No expected hex is hardcoded anywhere below.
 */
describe('useAppTheme primaryForeground contrast', () => {
  const accents = Object.keys(accentHex) as BalanceDisplayColor[];
  const schemes = ['light', 'dark'] as const;
  const cases = accents.flatMap((accent) => schemes.map((theme) => ({ accent, theme })));

  /**
   * WHAT THIS BLOCK DOES NOT COVER, discovered while extending it.
   *
   * It measures `colors.primary` against `colors.primaryForeground`. `ColorRoles.
   * primaryForeground` has three consumers in the whole app — `LoginScreen`,
   * `SignupScreen`, `PeriodSelector` — all hand-rolled. Paper's `Button` reads
   * `paperTheme.colors.onPrimary`, which was unmapped, so this test passed at 14.36:1
   * while the shipped button rendered Material purple on lime. The right shape of
   * assertion, on the wrong pair. The `paperTheme` block below is the same reasoning
   * applied to the values Paper actually paints with.
   */
  it.each(cases)(
    'primaryForeground on primary meets WCAG AA (>= 4.5:1) — accent=$accent, theme=$theme',
    async ({ accent, theme }) => {
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ theme, balanceDisplayColor: accent })
      );

      // Wait on `settingsLoading`, not on `colors`/`scheme` — for combinations that
      // happen to match DEFAULT_SETTINGS (theme 'dark', accent 'green'), `scheme` never
      // changes from its initial value, so waiting on it would resolve before the
      // AsyncStorage-loaded `balanceDisplayColor` has actually taken effect.
      const { result } = await renderHook(
        () => ({ theme: useAppTheme(), settings: useSettings() }),
        { wrapper }
      );
      await waitFor(() => expect(result.current.settings.settingsLoading).toBe(false));

      const { colors } = result.current.theme;
      const ratio = contrastRatio(colors.primary, colors.primaryForeground);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  );
});

/**
 * Contrast on the pairs REACT NATIVE PAPER renders, not the pairs the app hand-rolls.
 *
 * The block above measures `colors.primary`/`colors.primaryForeground`. Paper's `Button`,
 * `Chip`, `SegmentedButtons`, `Snackbar` and `HelperText` read `paperTheme.colors.*`
 * instead, and until this PR twenty-four of those thirty-three roles were Paper's own
 * Material-purple defaults. This measures what those components actually paint with.
 *
 * A CORRECTION TO THE SPEC, because the number matters more than the story. The spec
 * (`agent-os/specs/2026-09-14-1110-parity-md3-color-roles/shape.md`) says this test is
 * "the assertion that would have caught the original bug — `#381E72` on `#b5ef57` is
 * 3.06:1 and fails AA". Recomputed: Paper's dark `onPrimary` `#381E72` on the default
 * lime `#b5ef57` is **9.68:1**. It passes AA comfortably. The purple button was a BRAND
 * defect, not an accessibility one, and no contrast test of any threshold would have
 * caught it. The guard that does is `everyMd3RoleIsMapped.test.ts`, which compares the
 * built theme against Paper's base. This block is worth having on its own terms — it
 * guards the legibility of the mapping THIS PR introduces, several pairs of which are
 * genuinely tight — but it should not be believed to do the other job.
 *
 * Thresholds are per pair, with a reason, rather than a blanket 4.5. A single number
 * would have to be either unmeetable (the web's own `bg-primary/10 text-primary` is
 * 4.10:1 on the blue accent) or so low it asserts nothing.
 */
describe('paperTheme contrast on the pairs Paper renders', () => {
  interface Pair {
    /** Key in `paperTheme.colors` used as the ground. */
    background: 'primary' | 'secondaryContainer' | 'primaryContainer' | 'surface' | 'background' | 'error' | 'errorContainer';
    /** Key in `paperTheme.colors` painted on top of it. */
    foreground: 'onPrimary' | 'onSecondaryContainer' | 'onPrimaryContainer' | 'onSurface' | 'onBackground' | 'onError' | 'onErrorContainer';
    minRatio: number;
    why: string;
  }

  const PAIRS: Pair[] = [
    {
      background: 'primary',
      foreground: 'onPrimary',
      minRatio: 4.5,
      why: 'WCAG AA for body text. A contained Button\'s label is the app\'s primary CTA ("Log Food", "Add Workout") and is small text. Measured minimum across accents: 4.66 (blue, light).',
    },
    {
      background: 'surface',
      foreground: 'onSurface',
      minRatio: 4.5,
      why: 'AA. Every Card body. Measured minimum: 15.37.',
    },
    {
      background: 'background',
      foreground: 'onBackground',
      minRatio: 4.5,
      why: 'AA. Text outside a Surface. Measured minimum: 14.49.',
    },
    {
      background: 'secondaryContainer',
      foreground: 'onSecondaryContainer',
      minRatio: 3,
      why: 'WCAG AA for large text and UI components (1.4.11). This is the web\'s own `bg-primary/10 text-primary`, which measures 4.10:1 on the blue accent in light — raising the bar to 4.5 would fail the reference design rather than a regression in this mapping. Measured minimum: 4.10.',
    },
    {
      background: 'primaryContainer',
      foreground: 'onPrimaryContainer',
      minRatio: 3,
      why: 'Same accent-at-10% pair as secondaryContainer, same reasoning.',
    },
    {
      background: 'error',
      foreground: 'onError',
      minRatio: 3,
      why: 'A saturated red fill cannot reach 4.5:1 against anything the palette contains: this mapping measures 4.25 (dark) / 4.60 (light), and the WEB\'S OWN pairing (`--destructive` with a near-white `--destructive-foreground`) is worse at 3.79 / 3.34. 3:1 is the honest floor here; going higher would mean changing `--destructive` on both clients, which is a palette decision and not this PR\'s.',
    },
    {
      background: 'errorContainer',
      foreground: 'onErrorContainer',
      minRatio: 3,
      why: 'Danger text on a 10% danger tint — HelperText, Banner. Measured minimum: 3.85.',
    },
  ];

  const accents = Object.keys(accentHex) as BalanceDisplayColor[];
  const schemes = ['light', 'dark'] as const;
  const cases = accents.flatMap((accent) =>
    schemes.flatMap((theme) => PAIRS.map((pair) => ({ accent, theme, ...pair })))
  );

  it.each(cases)(
    '$foreground on $background >= $minRatio:1 — accent=$accent, theme=$theme',
    async ({ accent, theme, background, foreground, minRatio }) => {
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ theme, balanceDisplayColor: accent })
      );

      const { result } = await renderHook(
        () => ({ theme: useAppTheme(), settings: useSettings() }),
        { wrapper }
      );
      await waitFor(() => expect(result.current.settings.settingsLoading).toBe(false));

      const paperColors = result.current.theme.paperTheme.colors;
      // Both halves composite over `surface`, which is what a container role sits on in
      // every Paper component that uses one (Chip, SegmentedButtons, tonal Button, all
      // inside a Card or the page surface).
      const ground = composite(paperColors[background], paperColors.surface);
      const ink = composite(paperColors[foreground], ground);

      // Each pair's threshold and the reason for it are in PAIRS above; the test name
      // carries the pair, the accent and the scheme, which is what a failure needs to
      // point at.
      expect(contrastRatio(ground, ink)).toBeGreaterThanOrEqual(minRatio);
    }
  );

  it('reads real eight-digit values, so the compositing above is not dead code', async () => {
    // If the container roles ever stopped being alpha composites, every ratio in this
    // block would silently become a measurement of something else. Pin the shape.
    const { result } = await renderHook(() => useAppTheme(), { wrapper });

    expect(result.current.paperTheme.colors.secondaryContainer).toMatch(/^#[0-9a-f]{6}[0-9a-f]{2}$/);
    expect(composite('#ffffff80', '#000000')).toBe('#808080');
    expect(composite('#123456', '#000000')).toBe('#123456');
  });
});
