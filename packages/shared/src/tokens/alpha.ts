/**
 * `withAlpha` — a palette role at partial opacity, as an eight-digit `#RRGGBBAA`.
 *
 * The web spells this inline wherever it needs it: `bg-primary/10`, `bg-scrim/50`,
 * `hsl(var(--x) / 0.12)`. Tailwind resolves those at build time from an HSL triple;
 * React Native has no colour function, so the same thing has to be computed. Eight-digit
 * hex is the one alpha form RN accepts on every platform (`rgba()` strings work too, but
 * they are a different shape from every other value in `ColorRoles`, which is what makes
 * a mixed palette hard to read).
 *
 * This is a FUNCTION and not a table of precomputed constants on purpose: `primary` is
 * resolved at runtime from the user's accent choice (`useAppTheme`), so a constant would
 * freeze whichever accent happened to be the default when it was written — the exact
 * class of bug `mobile/src/theme/__tests__/noFrozenPaletteImports.test.ts` exists for.
 *
 * Written here rather than pulled from a colour library: it is ten lines, and
 * `agent-os/standards/global/tech-stack.md` treats a new dependency as a decision. Paper
 * bundles `color` transitively, but reaching into a transitive dependency is not that
 * decision being made.
 */

const SHORT_HEX = /^#[0-9a-fA-F]{3}$/;
const FULL_HEX = /^#[0-9a-fA-F]{6}$/;
const HEX_WITH_ALPHA = /^#[0-9a-fA-F]{8}$/;

/**
 * Returns `hex` at `alpha` opacity as `#RRGGBBAA`.
 *
 * Accepts the three shapes a palette value can arrive in — `#abc`, `#aabbcc` and
 * `#aabbccdd`. A hex that already carries an alpha channel has it **replaced**, not
 * multiplied: the caller is stating the opacity it wants, and silently compounding two
 * alphas would make `withAlpha(withAlpha(x, 0.5), 0.5)` mean something other than what it
 * reads as.
 *
 * @param hex   `#RGB`, `#RRGGBB` or `#RRGGBBAA` (case-insensitive).
 * @param alpha 0 (transparent) to 1 (opaque). Rounds to the nearest of the 256 channel
 *              values, so 0 is exactly `00` and 1 is exactly `ff`.
 * @throws if `hex` is not one of those shapes, or `alpha` is outside 0..1 — a silent
 *         fallback here would paint a wrong colour rather than fail a build.
 */
export function withAlpha(hex: string, alpha: number): string {
  let rgb: string;
  if (SHORT_HEX.test(hex)) {
    // `#abc` -> `aabbcc`
    rgb = hex
      .slice(1)
      .split('')
      .map((c) => c + c)
      .join('');
  } else if (FULL_HEX.test(hex)) {
    rgb = hex.slice(1);
  } else if (HEX_WITH_ALPHA.test(hex)) {
    rgb = hex.slice(1, 7);
  } else {
    throw new Error(
      `withAlpha: expected a hex colour (#abc, #aabbcc or #aabbccdd), got '${hex}'`
    );
  }

  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new Error(`withAlpha: alpha must be between 0 and 1, got ${alpha}`);
  }

  const channel = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${rgb.toLowerCase()}${channel}`;
}
