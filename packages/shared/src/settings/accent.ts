import type { BalanceDisplayColor } from './types';

/**
 * HSL values for --primary and --primary-foreground per accent color.
 * Format: "H S% L%" (no "hsl()" wrapper; Tailwind/CSS use these with hsl(var(--primary))).
 *
 * Source of truth: `frontend/src/index.css`, one HSL triplet per accent choice offered
 * in Settings > Appearance. Verbatim from the web — do not "improve" these; see the
 * Global Constraints in the phase plan.
 */
export interface PrimaryPalette {
  primary: string;
  primaryForeground: string;
  darkPrimary: string;
  darkPrimaryForeground: string;
}

export const ACCENT_PALETTE: Record<BalanceDisplayColor, PrimaryPalette> = {
  green: {
    primary: '150 28% 30%',
    primaryForeground: '36 40% 98%',
    darkPrimary: '83 83% 64%',
    darkPrimaryForeground: '12 10% 5%',
  },
  blue: {
    primary: '212 58% 48%',
    primaryForeground: '0 0% 100%',
    darkPrimary: '206 100% 68%',
    darkPrimaryForeground: '12 10% 5%',
  },
  neutral: {
    primary: '30 14% 14%',
    primaryForeground: '36 40% 98%',
    darkPrimary: '138 10% 96%',
    darkPrimaryForeground: '12 10% 5%',
  },
  primary: {
    primary: '150 28% 30%',
    primaryForeground: '36 40% 98%',
    darkPrimary: '83 83% 64%',
    darkPrimaryForeground: '12 10% 5%',
  },
};

/** `ACCENT_PALETTE`'s shape, with hex strings instead of "H S% L%" triplets. */
export interface AccentHexPalette {
  primary: string;
  primaryForeground: string;
  darkPrimary: string;
  darkPrimaryForeground: string;
}

/**
 * Converts one "H S% L%" triplet (`h` in degrees, `s`/`l` as 0-100 percentages) to a
 * "#rrggbb" string. Standard HSL->RGB (CSS Color 4, section 10) — not a
 * TrackVibe-specific formula, so a mismatch against `tokens/colors.ts` means the
 * *input* triplet disagrees with that file's CSS source, not that this math needs
 * adjusting.
 */
function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lNorm - c / 2;

  const [r, g, b] =
    hue < 60 ? [c, x, 0] :
    hue < 120 ? [x, c, 0] :
    hue < 180 ? [0, c, x] :
    hue < 240 ? [0, x, c] :
    hue < 300 ? [x, 0, c] :
    [c, 0, x];

  const toHex = (channel: number) => Math.round((channel + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Parses one "H S% L%" string (the format `ACCENT_PALETTE` stores) and hexes it. */
function hexFromTriplet(hsl: string): string {
  const [h, s, l] = hsl.split(' ').map((part) => parseFloat(part));
  return hslToHex(h, s, l);
}

function toHexPalette(palette: PrimaryPalette): AccentHexPalette {
  return {
    primary: hexFromTriplet(palette.primary),
    primaryForeground: hexFromTriplet(palette.primaryForeground),
    darkPrimary: hexFromTriplet(palette.darkPrimary),
    darkPrimaryForeground: hexFromTriplet(palette.darkPrimaryForeground),
  };
}

/**
 * `ACCENT_PALETTE` in hex, for React Native — it has no `hsl()` colour function, so
 * these need to be pre-computed rather than resolved at render/style time the way the
 * web resolves `hsl(var(--primary))`. Derived, never hand-typed: change
 * `ACCENT_PALETTE` and these follow. `green.primary` / `blue.primary` /
 * `neutral.primary` land on the exact hex `tokens/colors.ts` already has for
 * `primary` / `workout` / `text` (`lightColors`) — both were converted from the same
 * CSS source (that file's header comment names it). `accent.test.ts` pins the two
 * derivations against each other.
 */
export const accentHex: Record<BalanceDisplayColor, AccentHexPalette> = {
  green: toHexPalette(ACCENT_PALETTE.green),
  blue: toHexPalette(ACCENT_PALETTE.blue),
  neutral: toHexPalette(ACCENT_PALETTE.neutral),
  primary: toHexPalette(ACCENT_PALETTE.primary),
};
