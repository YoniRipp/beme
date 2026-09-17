/**
 * Spacing scale, shared by both clients.
 *
 * `frontend/tailwind.config.js` does not override `theme.extend.spacing`, so the web
 * uses Tailwind's stock 4px-based scale (`p-1` = 4px, `p-2` = 8px, `p-3` = 12px,
 * `p-4` = 16px, `p-6` = 24px, `p-8` = 32px). These are the same increments under the
 * names mobile already used. Unitless — the web maps back to rem/px at its own
 * Tailwind edge, React Native treats a bare number as density-independent pixels.
 *
 * **The names below are not the whole scale the web can reach.** Tailwind also has the
 * half-steps, and the web uses them: `gap-1.5` (6px) 31 times, `mt-0.5` (2px) 21 times,
 * `py-2.5` (10px) 9 times, `p-3.5` (14px) 3 times, `pb-10` (40px) once. Only `0.5` has a
 * name here (`xxs`); 6, 10, 14 and 40 stay literals on the mobile side, because inventing
 * t-shirt names for the gaps between the named steps reads worse than the number does.
 * `spacingUsesTheScale.test.ts` accepts them for that reason and rejects anything else —
 * they are on the web's scale, which is the thing being matched, not off it.
 */
export const spacing = {
  /**
   * `0.5` on Tailwind's scale — the optical nudge between two stacked lines of text, not a
   * gap. The web uses it 31 times (`mt-0.5`, `gap-0.5`, `py-0.5`), so it is part of the
   * shared vocabulary even though the named steps below start at 4.
   */
  xxs: 2,
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
  /**
   * `rounded-2xl` — **the** card radius. `agent-os/standards/frontend/mobile-ui.md` names it
   * directly ("every food, workout and exercise item is a card — `rounded-2xl`,
   * `shadow-card`, generous padding") and the web uses it at 33 call sites, so a scale
   * without it cannot express the one radius the standard mandates. Mobile's four card
   * components all fell back to `lg` (14) for want of this step.
   */
  xxl: 22,
  // `rounded-3xl` (30) is deliberately absent: zero usages on the web today, and an unused
  // scale step is a step that drifts. Add it when something needs it, not before.
} as const;

/**
 * Elevation scale, transcribed from the web's `--shadow-*` custom properties
 * (`frontend/src/index.css`, light mode). Each CSS variable layers two box-shadows;
 * these are the outer (larger, more visible) layer of each, reduced to plain
 * numbers so either client can build its own shadow representation — `box-shadow`
 * on the web, `shadowOffset`/`shadowRadius`/`shadowOpacity` (iOS) or a derived
 * `elevation` value (Android) on mobile.
 *
 * Keeping only the outer layer is a deliberate approximation, not an oversight: RN cannot
 * express two shadow layers on one view, so there is nothing to transcribe the inner layer
 * into. `android` is a judgement per step rather than a derivation — Android's model has no
 * offset, blur or opacity to map from, only a depth integer.
 *
 * Use `shadowStyle()` below rather than reading these fields directly; it carries the
 * blur-to-shadowRadius relationship that is easy to get wrong.
 */
export const elevation = {
  xs: { offsetY: 1, blur: 2, opacity: 0.04, android: 1 },
  sm: { offsetY: 1, blur: 3, opacity: 0.06, android: 2 },
  md: { offsetY: 4, blur: 8, opacity: 0.06, android: 4 },
  lg: { offsetY: 12, blur: 32, opacity: 0.08, android: 8 },
} as const;

export type ElevationStep = keyof typeof elevation;

/**
 * A React Native shadow style for one elevation step.
 *
 * RN needs five separate properties where CSS needs one string, and the two platforms do
 * not agree on what a shadow is: iOS reads `shadowColor`/`shadowOffset`/`shadowOpacity`/
 * `shadowRadius`, Android reads the single `elevation` integer and ignores the other four
 * entirely — including the colour, which is why the Android values are chosen per step
 * rather than derived.
 *
 * **`shadowRadius` is not CSS `blur`.** The conventional mapping is `blur / 2`, because CSS
 * blur describes the full spread of the gaussian and RN's radius describes half of it.
 * Stated here because it looks like an off-by-two and gets "corrected" back.
 *
 * @param step Which step of the scale.
 * @param shadowColor The composited shadow hue — pass `colors.shadow` (`#3d3229` in light,
 *   `#000000` in dark). Not defaulted: a shadow that silently falls back to black is the
 *   bug the `shadow` role was added to prevent.
 */
export function shadowStyle(step: ElevationStep, shadowColor: string) {
  const { offsetY, blur, opacity, android } = elevation[step];
  return {
    shadowColor,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur / 2,
    elevation: android,
  } as const;
}
