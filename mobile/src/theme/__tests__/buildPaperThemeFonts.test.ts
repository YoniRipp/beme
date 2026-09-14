import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { buildPaperTheme, colors, darkColors } from '../../theme';

/**
 * Pins Task 5's font mapping: the web pairs Fraunces (display) + Inter (body) —
 * `frontend/index.html:32`, `frontend/src/index.css:98` — and overrides Fraunces's own
 * default weight (700) down to 500 for `h1`/`h2` (`frontend/src/index.css:210-221`,
 * documented in `packages/shared/src/tokens/typography.ts`). Paper's closest
 * equivalents to `h1`/`h2` are the `display*` variants and `titleLarge` (all four
 * default to Paper's *regular* weight — see `node_modules/react-native-paper`'s MD3
 * `typescale`), so those four get Fraunces at weight 500; every other variant — the
 * app's "body text" — moves onto Inter instead of Paper's default Roboto/System,
 * keeping whatever weight (regular or medium) Paper's own typescale already gave it.
 *
 * These are the exact family names `useFonts()` registers in `App.tsx` — see that
 * file's own doc comment for why hardcoding the string here (rather than threading a
 * value through `buildPaperTheme`'s arguments) is safe even though this theme is also
 * built at module load time, before any font has loaded.
 */
const FRAUNCES_DISPLAY = 'Fraunces_500Medium';
const INTER_REGULAR = 'Inter_400Regular';
const INTER_MEDIUM = 'Inter_500Medium';

describe('buildPaperTheme fonts', () => {
  const theme = buildPaperTheme(MD3LightTheme, colors);

  it.each(['displayLarge', 'displayMedium', 'displaySmall', 'titleLarge'] as const)(
    '%s uses Fraunces at weight 500',
    (variant) => {
      expect(theme.fonts[variant].fontFamily).toBe(FRAUNCES_DISPLAY);
      expect(theme.fonts[variant].fontWeight).toBe('500');
    }
  );

  it.each(['headlineLarge', 'headlineMedium', 'headlineSmall', 'bodyLarge', 'bodyMedium', 'bodySmall'] as const)(
    '%s uses regular-weight Inter, not Fraunces',
    (variant) => {
      expect(theme.fonts[variant].fontFamily).toBe(INTER_REGULAR);
      expect(theme.fonts[variant].fontWeight).toBe('400');
    }
  );

  it.each(['titleMedium', 'titleSmall', 'labelLarge', 'labelMedium', 'labelSmall'] as const)(
    '%s keeps its default medium weight, on Inter instead of Paper\'s default face',
    (variant) => {
      expect(theme.fonts[variant].fontFamily).toBe(INTER_MEDIUM);
      expect(theme.fonts[variant].fontWeight).toBe('500');
    }
  );

  it('does not disturb Paper’s own size/line-height/letter-spacing scale', () => {
    const base = MD3LightTheme.fonts.displayLarge;
    expect(theme.fonts.displayLarge.fontSize).toBe(base.fontSize);
    expect(theme.fonts.displayLarge.lineHeight).toBe(base.lineHeight);
    expect(theme.fonts.displayLarge.letterSpacing).toBe(base.letterSpacing);
  });

  it('is the same font map regardless of light/dark base — fonts do not vary with colour scheme', () => {
    const darkTheme = buildPaperTheme(MD3DarkTheme, darkColors);
    expect(darkTheme.fonts).toEqual(theme.fonts);
  });
});
