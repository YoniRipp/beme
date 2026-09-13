import { MD3DarkTheme, MD3LightTheme, configureFonts, type MD3Theme } from 'react-native-paper';
import { lightColors, darkColors, colors, spacing, radii, type ColorRoles } from '@trackvibe/shared/tokens';

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
 * though `paperTheme`/`paperDarkTheme` below are built at *module load* time — before
 * any font has necessarily finished loading. Unlike `colors` (which genuinely varies
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
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  display: 'Fraunces_500Medium',
} as const;

const INTER_REGULAR = fonts.regular;
const INTER_MEDIUM = fonts.medium;
const FRAUNCES_DISPLAY = fonts.display;

const regularType = { fontFamily: INTER_REGULAR, fontWeight: '400' as const };
const mediumType = { fontFamily: INTER_MEDIUM, fontWeight: '500' as const };

// The web overrides Fraunces's own default weight (700) down to 500 for `h1`/`h2`
// (`frontend/src/index.css:210-221`; documented in
// `packages/shared/src/tokens/typography.ts`). Paper's MD3 typescale has no direct
// `h1`/`h2` — its closest equivalents are the `display*` variants and `titleLarge`,
// which is why those four (and only those four) get Fraunces here; every other
// variant is "body text" and stays on Inter.
const displayType = { fontFamily: FRAUNCES_DISPLAY, fontWeight: '500' as const };

/**
 * Paper's default MD3 typescale re-pointed at the app's two type families, keeping
 * every variant's own size/line-height/letter-spacing untouched — only `fontFamily`/
 * `fontWeight` move. `titleMedium`/`titleSmall`/`labelLarge`/`labelMedium`/`labelSmall`
 * default to medium weight in Paper's own typescale, so they get Inter's medium cut
 * rather than flattening to regular; `headlineLarge`/`Medium`/`Small` default to
 * regular alongside `bodyLarge`/`Medium`/`Small`, so those five get Inter regular.
 */
const appFonts = configureFonts({
  config: {
    displayLarge: displayType,
    displayMedium: displayType,
    displaySmall: displayType,
    titleLarge: displayType,
    headlineLarge: regularType,
    headlineMedium: regularType,
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
 * (`MD3LightTheme`/`MD3DarkTheme`) so every MD3 role this doesn't touch keeps Paper's
 * own default. Extracted (task 3) so the static `paperTheme`/`paperDarkTheme` below and
 * `theme/useAppTheme.ts`'s runtime-resolved theme — same base palettes, but with
 * `primary` swapped for the user's accent-colour choice — share one mapping instead of
 * two copies that can drift apart. `fonts` (task 5) is the same map regardless of
 * base, since family choice doesn't depend on light/dark.
 */
export function buildPaperTheme(base: MD3Theme, palette: ColorRoles): MD3Theme {
  return {
    ...base,
    roundness: radius.md,
    fonts: appFonts,
    colors: {
      ...base.colors,
      primary: palette.primary,
      secondary: palette.food,
      background: palette.background,
      surface: palette.surface,
      surfaceVariant: palette.surfaceMuted,
      outline: palette.border,
      onSurface: palette.text,
      onSurfaceVariant: palette.textMuted,
      error: palette.danger,
    },
  };
}

export const paperTheme = buildPaperTheme(MD3LightTheme, colors);
export const paperDarkTheme = buildPaperTheme(MD3DarkTheme, darkColors);
