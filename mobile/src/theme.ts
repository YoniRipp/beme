import { configureFonts, type MD3Theme } from 'react-native-paper';
import { lightColors, darkColors, colors, spacing, radii, typeFaces, withAlpha, type ColorRoles } from '@trackvibe/shared/tokens';

/**
 * Design tokens now live in `@trackvibe/shared/tokens` (task 11), transcribed from
 * the web client's CSS custom properties (`frontend/src/index.css`) so both clients
 * draw from one palette instead of two hand-maintained hex lists. Re-exported here
 * under their original names so every existing import site
 * (`import { colors, spacing, radius } from '../theme'`, etc.) keeps working
 * unchanged — this file is now a thin adapter from the shared tokens to
 * `react-native-paper`'s theme shape, not a second source of colour values.
 */
export { lightColors, darkColors, colors, spacing };

// `radius` is the name every mobile screen already imports; `radii` is the shared
// package's name for the same scale (see packages/shared/src/tokens/spacing.ts).
export const radius = radii;

/**
 * Font family names as registered by `useFonts()` in `App.tsx` (task 5). These are
 * plain string literals, not values threaded in from that hook, which is safe even
 * though `buildPaperTheme` bakes them into `fonts` at *module load* time — before any
 * font has necessarily finished loading. Unlike `colors` (which genuinely varies
 * at runtime with the user's theme/accent settings, see the frozen-palette guard test
 * in this same directory), a font family name is just a fixed key that `expo-font`
 * registers globally; whether text painted with that key looks right depends only on
 * whether `App.tsx` loaded it before rendering, never on when this string was written.
 *
 * The web pairs Fraunces (display) + Inter (body) — `frontend/index.html:32`,
 * `frontend/src/index.css:98`. `@expo-google-fonts/*` ships one static file per weight
 * rather than a single variable font, so (unlike CSS) there is no `font-weight` that
 * retargets which file renders — the weight you want has to be the specific family
 * name you loaded and reference here.
 */
/**
 * Exported because Paper's typescale only reaches Paper's own `<Text>`. The three
 * pre-auth surfaces — `LoginScreen`, `SignupScreen` and `RootNavigator`'s loading
 * screen — are built from raw react-native primitives, so they have to name the font
 * themselves or they silently render in the system face. Those are the first screens a
 * new user ever sees, so "silently" would have meant "always", for them.
 */
export const fonts = {
  regular: typeFaces.regular.expo,
  medium: typeFaces.medium.expo,
  semibold: typeFaces.semibold.expo,
  bold: typeFaces.bold.expo,
  display: typeFaces.display.expo,
  displaySemibold: typeFaces.displaySemibold.expo,
} as const;

/**
 * What a CSS weight becomes here.
 *
 * | web | face | note |
 * |---|---|---|
 * | `font-normal` (400) | `fonts.regular` | |
 * | `font-medium` (500) | `fonts.medium` | |
 * | `font-semibold` (600) | `fonts.semibold` | |
 * | `font-bold` (700) | `fonts.bold` | |
 * | `font-extrabold` (800) | `fonts.bold` | the web's own 800 is unbacked — see `App.tsx` |
 *
 * A numeric `fontWeight` may stay alongside `fontFamily` in a style: it is a no-op on iOS
 * but Android's font matching can still use it, and it costs nothing. What it must not do is
 * appear *alone* — that is the mistake this table exists to end.
 */

const INTER_REGULAR = fonts.regular;
const INTER_MEDIUM = fonts.medium;
const FRAUNCES_DISPLAY = fonts.display;

const regularType = { fontFamily: INTER_REGULAR, fontWeight: '400' as const };
const mediumType = { fontFamily: INTER_MEDIUM, fontWeight: '500' as const };

/**
 * Fraunces 500, for the large-display end.
 *
 * `frontend/src/index.css` overrides Fraunces's own default weight (700) down to 500 for
 * `h1`/`h2`, and this used to be handed to all three `display*` variants AND `titleLarge` on
 * the strength of that rule alone. **Reasoning from the stylesheet was the mistake**: both
 * components that actually render a title override the base rule, so the two headings a phone
 * user sees on the web are neither of them Fraunces 500. See `titleType` and
 * `pageTitleType` below. `Base44Layout.tsx:264`'s desktop app bar IS Fraunces 500, which is
 * why the `display*` variants keep it.
 */
const displayType = { fontFamily: FRAUNCES_DISPLAY, fontWeight: '500' as const };

/**
 * Fraunces 600, for `titleLarge` — the mobile app bar title.
 *
 * `Base44Layout.tsx:228` renders it `font-display text-lg font-semibold tracking-tight`:
 * Fraunces **600**, not 500. This is the title on every screen, so it is the one worth a
 * bundled face of its own.
 */
const titleType = { fontFamily: fonts.displaySemibold, fontWeight: '600' as const };

/**
 * Inter 700 at 28px, for `headlineMedium` — the page title.
 *
 * `ui/page.tsx`'s `PageHeader` `<h1>` is `font-sans text-[28px] font-extrabold`, so the
 * page title on the web is **Inter, not Fraunces at all** — the base `h1 { font-serif }` rule
 * is overridden right there. Paper's `headlineMedium` is already 28px, which is exactly
 * `PageHeader`'s bracket value.
 *
 * 700 rather than 800 because the web's `font-extrabold` has no 800 file behind it either
 * (see `App.tsx`); matching a synthesised weight with a real one would overshoot.
 */
const pageTitleType = { fontFamily: fonts.bold, fontWeight: '700' as const };

/**
 * Paper's default MD3 typescale re-pointed at the app's two type families, keeping
 * every variant's own size/line-height/letter-spacing untouched — only `fontFamily`/
 * `fontWeight` move.
 *
 * The mapping follows **what the web's components render**, not what its base stylesheet
 * says. Those disagree: `index.css` gives `h1`/`h2` Fraunces 500, and both title components
 * override it. Getting that backwards is how `titleLarge` and `headlineMedium` ended up on
 * faces no web surface uses. `titleMedium`/`titleSmall`/`labelLarge`/`labelMedium`/`labelSmall`
 * default to medium weight in Paper's own typescale, so they get Inter's medium cut
 * rather than flattening to regular; `headlineLarge`/`Medium`/`Small` default to
 * regular alongside `bodyLarge`/`Medium`/`Small`, so those five get Inter regular.
 */
const appFonts = configureFonts({
  config: {
    displayLarge: displayType,
    displayMedium: displayType,
    displaySmall: displayType,
    titleLarge: titleType,
    headlineLarge: regularType,
    headlineMedium: pageTitleType,
    headlineSmall: regularType,
    titleMedium: mediumType,
    titleSmall: mediumType,
    labelLarge: mediumType,
    labelMedium: mediumType,
    labelSmall: mediumType,
    bodyLarge: regularType,
    bodyMedium: regularType,
    bodySmall: regularType,
  },
});

/**
 * Maps a `ColorRoles` palette onto a react-native-paper MD3 theme, layered over a base
 * (`MD3LightTheme`/`MD3DarkTheme`). Extracted (task 3) so that one mapping serves every
 * caller instead of copies that drift apart. `theme/useAppTheme.ts` is now the only
 * caller outside tests: it picks the base by scheme and hands over the palette with
 * `primary`/`primaryForeground` swapped for the user's accent-colour choice. `fonts`
 * (task 5) is the same map regardless of base, since family choice doesn't depend on
 * light/dark.
 *
 * EVERY MD3 ROLE IS SPELLED OUT HERE, AND THAT IS THE POINT. This docstring used to say
 * the opposite — "every MD3 role this doesn't touch keeps Paper's own default" — framed
 * as a deliberate choice, and that sentence is why the bug below survived review for as
 * long as it did. Paper's defaults are not neutral: `MD3DarkTheme` is generated from
 * `primary40 = #6750A4`, so an inherited role is not "unstyled", it is *a different
 * brand's purple*. Nine of thirty-three roles were mapped; of the twenty-four inherited,
 * six were on screen — purple label text on the lime "Log Food" pill (`onPrimary`),
 * a purple block behind every selected segment (`secondaryContainer`), a purple-grey
 * dialog ground and a purple modal wash (`elevation.level3`, `backdrop`), and a lilac
 * rule between exercise rows (`outlineVariant`). `DEFAULT_SETTINGS.theme` is `'dark'`,
 * so that was the default experience.
 *
 * The rule this file now follows: a role Paper adds in a future version is a DECISION,
 * not a default to inherit silently. `theme/__tests__/everyMd3RoleIsMapped.test.ts`
 * walks the base theme's own keys and fails on anything left unmapped, so a Paper minor
 * that introduces one turns the build red rather than quietly painting it purple.
 *
 * `...base.colors` is kept as the spread underneath deliberately — not because anything
 * should reach it, but so a role added upstream still *renders* (Paper reads it
 * unconditionally) while the guard reports it. A missing key would crash a component;
 * a purple one only looks wrong.
 *
 * Every value below traces to the web (`frontend/src/index.css`, or a
 * `frontend/src/components/ui/` primitive) via `@trackvibe/shared/tokens`. The mapping
 * table with each role's Paper default, its target and the components that read it is in
 * `agent-os/specs/2026-09-14-1110-parity-md3-color-roles/shape.md`.
 */
export function buildPaperTheme(base: MD3Theme, palette: ColorRoles): MD3Theme {
  /**
   * MD3's "container" roles are a tinted ground with the accent itself as the
   * foreground. The web spells that pattern out longhand at each call site —
   * `bg-primary/10 text-primary` in `PeriodSelector.tsx` and `AiInsightsSection.tsx` —
   * so 10% is a transcription, not an approximation. Alpha rather than the existing
   * `primarySoft` role, because `primarySoft` is `--sage-50`, a fixed sage tint that
   * would NOT follow the user's accent choice the way `bg-primary/10` does; `primary`
   * here is already accent-resolved by `useAppTheme`.
   */
  const primaryContainer = withAlpha(palette.primary, 0.1);

  return {
    ...base,

    /**
     * **`roundness` is a fallback, not this app's radius.** Paper does not use it as a
     * corner radius; it uses it as a *unit* and multiplies it by a different fixed factor
     * per component:
     *
     * | Paper component | factor | `roundness: 12` resolves to | the web's value |
     * |---|---|---|---|
     * | `Button` | 5x | 60 -> clamps to a pill | 12 (`button.tsx`, `rounded-md`) |
     * | `SegmentedButtons` | 5x | 60 -> pill | 10 (`tabs.tsx`, `rounded-sm`) |
     * | `Card` | 3x | 36 | 22 (`card.tsx`, `rounded-2xl`) |
     * | `Dialog` | 7x | 84 -> clamps | 14 (`rounded-lg`) |
     * | `Chip` | 2x | 24 | 18 (`rounded-xl`) |
     * | `Searchbar` (bar mode) | 7x | 84 -> pill | 12 (`input.tsx`, `rounded-md`) |
     *
     * **No value of `roundness` fixes this.** The web's six radii are 12, 10, 22, 14, 18 and
     * 12, which are not in the ratio 5 : 5 : 3 : 7 : 2 : 7 — its buttons would need
     * `roundness = 2.4`, its cards `7.33`, its dialogs `2`. Tuning the constant trades one
     * wrong component for another, which is exactly the change this comment exists to stop.
     *
     * So it stays at `radius.md`, governing only the Paper components nothing wraps, and the
     * components that matter override it from `mobile/src/components/ui/` — a style on the
     * component wins over Paper's internal value. Lowering it would make the unwrapped ones
     * *more* wrong, not less.
     */
    roundness: radius.md,
    fonts: appFonts,
    colors: {
      ...base.colors,

      primary: palette.primary,
      onPrimary: palette.primaryForeground,
      primaryContainer,
      onPrimaryContainer: palette.primary,

      // NOT `palette.food`, which is what this used to be.
      // `agent-os/standards/frontend/design-tokens.md`: "Terracotta is reserved for
      // food/energy — don't spend it as a generic accent." MD3 `secondary` is the
      // definition of a generic accent (Paper spends it on `DialogIcon` and little
      // else), and the web's own `--secondary` is a warm neutral, not terracotta.
      // Terracotta keeps its own first-class role — `palette.food`, and MD3 `tertiary`
      // below — for the Energy surfaces that actually mean it.
      secondary: palette.textMuted,
      onSecondary: palette.surface,
      secondaryContainer: primaryContainer,
      onSecondaryContainer: palette.primary,

      tertiary: palette.food,
      onTertiary: palette.primaryForeground,
      tertiaryContainer: palette.foodSoft,
      onTertiaryContainer: palette.food,

      background: palette.background,
      onBackground: palette.text,
      surface: palette.surface,
      onSurface: palette.text,
      surfaceVariant: palette.surfaceMuted,
      onSurfaceVariant: palette.textMuted,
      // MD3's disabled mechanism is the ink at low opacity over whatever is behind it.
      // The web instead puts `disabled:opacity-50` on the whole element; those are
      // different renderings and matching the web exactly would mean overriding opacity
      // per component. Keeping MD3's mechanism with the app's ink is the trade the spec
      // chose — the colour is ours either way.
      surfaceDisabled: withAlpha(palette.text, 0.12),
      onSurfaceDisabled: withAlpha(palette.text, 0.38),

      error: palette.danger,
      // The card colour on the error fill — which is dark ink in DARK and near-white in
      // LIGHT, so this is one role whose character flips with the scheme; don't read the
      // dark half as the rule. It beats the web's own `--destructive` /
      // `--destructive-foreground` pairing in both: 4.25:1 vs 3.79:1 dark, 4.60:1 vs
      // 4.42:1 light. Neither reaches AA 4.5 on a saturated red in dark; see the per-pair
      // thresholds in `useAppTheme.test.tsx`.
      onError: palette.surface,
      errorContainer: withAlpha(palette.danger, 0.1),
      onErrorContainer: palette.danger,

      outline: palette.border,
      // The web has exactly one rule colour — `--hairline` — so both outline roles read
      // it. MD3 wants `outlineVariant` subtler than `outline`; inventing a second warm
      // hairline to satisfy that would be a colour no web surface has.
      outlineVariant: palette.border,

      inverseSurface: palette.text,
      inverseOnSurface: palette.background,
      /**
       * NOT `palette.primary`, which is what shape.md's table says and what review
       * caught. `inversePrimary` is the one accent role painted on `inverseSurface`
       * rather than on the page, and `inverseSurface` here is `palette.text` — so in
       * dark it sits on near-white and in light on near-black, i.e. the opposite ground
       * from every other accent use. The accent itself therefore measures backwards
       * against it, and on the `neutral` accent it is the SAME COLOUR:
       *
       *   palette.primary    dark 1.23 (green) / 1.94 (blue) / 1.02 (neutral)
       *                      light 2.21 (green) / 3.29 (blue) / 1.00 (neutral)
       *   palette.primarySoft dark 14.20 · light 14.00
       *
       * `primarySoft` is the only role that flips with the scheme the way this one has
       * to — `--sage-50` is a near-white tint in light and a near-black one in dark —
       * so it is legible on the inverse ground in both. The cost is that it is a fixed
       * sage rather than accent-resolved, which is the same trade `primaryContainer`
       * declined above; the difference is that there the accent was legible and here it
       * is not, and an unreadable accent is not accent fidelity.
       *
       * Latent today — Paper's only consumer is `Snackbar`'s action label and the app
       * has no `Snackbar` — which is exactly why it needed measuring rather than
       * eyeballing. Pinned by the `inverseSurface`/`inversePrimary` pair in
       * `theme/__tests__/useAppTheme.test.tsx`, so a move back to `palette.primary`
       * fails the build instead of shipping an invisible button.
       */
      inversePrimary: palette.primarySoft,

      shadow: palette.shadow,
      scrim: palette.scrim,
      // `dialog.tsx` and `sheet.tsx` both overlay with `bg-scrim/50`.
      backdrop: withAlpha(palette.scrim, 0.5),

      /**
       * Paper's tonal-elevation model tints a surface by depth, and its five levels are
       * `primary40`/`primary80` composited over the surface at 5/8/11/12/14% — baked
       * into opaque `rgb()` strings so RN's shadow handling doesn't break. They are
       * literally the purple; there is no way to inherit them and not inherit it.
       *
       * The web never tints a card by depth: `card.tsx` is `bg-card shadow-card`, a flat
       * surface plus a box-shadow. So all five levels are the surface, and the depth cue
       * belongs to the shadow scale (a separate concern — see the
       * `2026-09-14-1112-parity-radius-elevation-spacing` spec).
       *
       * `level0` stays `'transparent'`: that is not a colour, it is Paper's "no surface"
       * sentinel, and painting it would give every flat `Surface` a background.
       */
      elevation: {
        level0: 'transparent',
        level1: palette.surface,
        level2: palette.surface,
        level3: palette.surface,
        level4: palette.surface,
        level5: palette.surface,
      },
    },
  };
}

/*
 * There were two more exports here — `paperTheme` and `paperDarkTheme`, built at module
 * load from the STATIC palettes — and they are gone rather than kept for symmetry.
 *
 * Nothing imported either one: `theme/ThemeContext.tsx` mounts `PaperProvider` with
 * `useAppTheme`'s runtime-resolved theme, and that calls `buildPaperTheme` directly. So
 * both were frozen to light mode and the default green accent with no way for a user's
 * settings to reach them — the same defect class as the frozen `colors` alias, one layer
 * up, and this change made them worse by widening what they bake from nine roles to
 * thirty-three. `FROZEN_PALETTE_NAMES` in `theme/__tests__/noFrozenPaletteImports.test.ts`
 * lists both names, so importing one is now a build failure; an export whose only
 * possible use fails the build is not an export, it is a trap. The guard keeps the names
 * so that re-adding either is also a build failure.
 */
