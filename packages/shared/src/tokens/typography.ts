/**
 * Typography tokens, shared by both clients.
 *
 * Source of truth: `frontend/tailwind.config.js` (`fontFamily`, the custom `eyebrow`/
 * `caption` sizes) and the display-heading rules in `frontend/src/index.css`
 * (`h1`/`h2`, `.text-display-*`). Family names only — no font files ship from here.
 * The web resolves them through its own font loading; mobile has no bundled
 * Inter/Fraunces yet, so a screen that references `fontFamily.serif` before those
 * assets exist just renders the platform default, exactly as it does today.
 */
export const fontFamily = {
  sans: 'Inter',
  serif: 'Fraunces',
} as const;

/**
 * Sizes as unitless, px-equivalent numbers. `xs`–`4xl` are Tailwind's stock scale
 * (frontend/tailwind.config.js does not override them); `caption`/`eyebrow` are the
 * two sizes it adds on top, for the small-label pattern used across card UI (11px
 * eyebrow labels, 10px captions) that used to be arbitrary values at each call site.
 */
export const fontSize = {
  caption: 10,
  eyebrow: 11,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

/**
 * Standard numeric weight steps. `medium` is the one currently load-bearing on the
 * web: `frontend/src/index.css` sets both `h1` and `h2` to weight 500 rather than
 * Fraunces's default 700. The rest are reserved so both clients share one
 * vocabulary as more of the type scale gets used by name.
 */
export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;
