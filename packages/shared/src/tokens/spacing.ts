/**
 * Spacing scale, shared by both clients.
 *
 * `frontend/tailwind.config.js` does not override `theme.extend.spacing`, so the web
 * uses Tailwind's stock 4px-based scale (`p-1` = 4px, `p-2` = 8px, `p-3` = 12px,
 * `p-4` = 16px, `p-6` = 24px, `p-8` = 32px). These are the same increments under the
 * names mobile already used. Unitless — the web maps back to rem/px at its own
 * Tailwind edge, React Native treats a bare number as density-independent pixels.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Corner radius scale, transcribed from the web's `--radius` custom property
 * (`frontend/src/index.css`, `0.875rem` = 14px) and the four steps
 * `frontend/tailwind.config.js` derives from it — its own comment spells out
 * `sm 10 · md 12 · lg 14 · xl 18`, i.e. `radius-4 / radius-2 / radius / radius+4`.
 *
 * Kept in ascending order deliberately: that same config comment explains that `xl`
 * previously fell through to Tailwind's default and came out *smaller* than `lg`,
 * and commit `1f7ba25` ("Put the radius scale in order") had to fix an equivalent
 * drift once already. `colors.test.ts` asserts the order stays intact.
 */
export const radii = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 18,
} as const;

/**
 * Elevation scale, transcribed from the web's `--shadow-*` custom properties
 * (`frontend/src/index.css`, light mode). Each CSS variable layers two box-shadows;
 * these are the outer (larger, more visible) layer of each, reduced to plain
 * numbers so either client can build its own shadow representation — `box-shadow`
 * on the web, `shadowOffset`/`shadowRadius`/`shadowOpacity` (iOS) or a derived
 * `elevation` value (Android) on mobile.
 */
export const elevation = {
  xs: { offsetY: 1, blur: 2, opacity: 0.04 },
  sm: { offsetY: 1, blur: 3, opacity: 0.06 },
  md: { offsetY: 4, blur: 8, opacity: 0.06 },
  lg: { offsetY: 12, blur: 32, opacity: 0.08 },
} as const;
