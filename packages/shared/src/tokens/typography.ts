/**
 * Typography tokens, shared by both clients.
 *
 * Source of truth: `frontend/tailwind.config.js` (`fontFamily`, the custom `eyebrow`/
 * `caption` sizes) and the display-heading rules in `frontend/src/index.css`
 * (`h1`/`h2`, `.text-display-*`). No font files ship from here — each client resolves a
 * face through its own loader.
 *
 * **This file had zero importers for its whole life, and one of its three exports could
 * never have had any.** It exported `fontFamily = { sans: 'Inter', serif: 'Fraunces' }`, which
 * are the CSS family names; Expo registers `Inter_400Regular` and `Fraunces_500Medium`, so
 * mobile could not use them and declared its own `fonts` constant instead. `fontWeight` had
 * the mirror problem: it mapped names to numbers, and on Expo a weight is not a number, it is
 * part of the family name. A token nobody can import is worse than no token.
 *
 * `typeFaces` is the shape that can serve both: one row per role, naming the CSS family and
 * weight the web writes AND the registered family Expo loads. `mobile/src/theme.ts`'s `fonts`
 * is derived from the `expo` column rather than duplicating it, and
 * `mobile/src/theme/__tests__/fontsMatchTheToken.test.ts` fails if the two decouple.
 */
/**
 * There is deliberately **no 800 row.** The web writes `font-extrabold` at 34 call sites, but
 * `frontend/index.html` requests Inter at `wght@300;400;500;600;700` — nothing serves 800, so
 * the browser synthesises or clamps it. Adding a real 800 face would let mobile render
 * *heavier* than the reference it exists to match. Whether the web adds 800 to its font URL or
 * drops those 34 to `font-bold` is a web-side decision; until then, 800 means `bold`.
 */
export const typeFaces = {
  regular: { css: 'Inter', weight: 400, expo: 'Inter_400Regular' },
  medium: { css: 'Inter', weight: 500, expo: 'Inter_500Medium' },
  semibold: { css: 'Inter', weight: 600, expo: 'Inter_600SemiBold' },
  bold: { css: 'Inter', weight: 700, expo: 'Inter_700Bold' },
  /** Fraunces 500 — the web's base `h1`/`h2` rule, and its desktop app bar. */
  display: { css: 'Fraunces', weight: 500, expo: 'Fraunces_500Medium' },
  /** Fraunces 600 — the mobile app bar title (`Base44Layout.tsx:228`). */
  displaySemibold: { css: 'Fraunces', weight: 600, expo: 'Fraunces_600SemiBold' },
} as const;

export type TypeFace = keyof typeof typeFaces;


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
  /**
   * `PageHeader`'s `text-[28px]` — a bracket value on the web and Paper's `headlineMedium`
   * size on mobile. It is a real size in both clients; it just never had a name on one of
   * them, which is how it reads as arbitrary.
   */
  pageTitle: 28,
} as const;

/**
 * Standard numeric weight steps, kept for the web, which really does write a number.
 *
 * On Expo these are **not** usable on their own: `@expo-google-fonts/*` ships one static file
 * per weight rather than a variable font, so there is no `font-weight` that retargets which
 * file renders. Use `typeFaces[...].expo` there. A numeric weight may sit alongside the
 * family in a React Native style — Android's font matching can use it — but never instead of
 * one. 52 of mobile's 55 weight declarations once named a weight with no file behind it.
 */
export const fontWeight = {
  regular: typeFaces.regular.weight,
  medium: typeFaces.medium.weight,
  semibold: typeFaces.semibold.weight,
  bold: typeFaces.bold.weight,
} as const;
