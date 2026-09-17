import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { buildPaperTheme, colors, darkColors } from '../../theme';

/**
 * Pins the font mapping: the web pairs Fraunces (display) + Inter (body) —
 * `frontend/index.html:32`, `frontend/src/index.css:98` — and every variant moves onto one of
 * them instead of Paper's default Roboto/System, keeping whatever weight (regular or medium)
 * Paper's own typescale already gave it.
 *
 * **This docstring used to argue the mapping from `index.css`'s base `h1, h2 { font-serif;
 * font-weight: 500 }` rule, and that reasoning was wrong.** The rule is real, and both
 * components that actually render a title override it:
 *
 * | surface | classes | resolves to |
 * |---|---|---|
 * | `ui/page.tsx` `PageHeader` `<h1>` | `font-sans text-[28px] font-extrabold` | **Inter 700**, no Fraunces at all |
 * | `Base44Layout.tsx:228` app bar `<h2>` | `font-display text-lg font-semibold` | **Fraunces 600** |
 * | `Base44Layout.tsx:264` desktop app bar | `font-display text-[22px] font-medium` | Fraunces 500 |
 *
 * So the two headings a phone user sees on the web are Inter 700 and Fraunces 600 — and the
 * old mapping gave `titleLarge` and `headlineMedium` Fraunces 500, which is neither. The
 * `display*` variants keep Fraunces 500 because the desktop app bar genuinely is that.
 *
 * Reasoning from the stylesheet instead of from the rendered surface is the specific mistake
 * being corrected here, so it is written down rather than quietly fixed: a test that says
 * "these four and only these four get Fraunces" is the artefact that makes someone revert it.
 *
 * These are the exact family names `useFonts()` registers in `App.tsx` — see that
 * file's own doc comment for why hardcoding the string here (rather than threading a
 * value through `buildPaperTheme`'s arguments) is safe even though this theme is also
 * built at module load time, before any font has loaded.
 */
const FRAUNCES_DISPLAY = 'Fraunces_500Medium';
const FRAUNCES_TITLE = 'Fraunces_600SemiBold';
const INTER_REGULAR = 'Inter_400Regular';
const INTER_MEDIUM = 'Inter_500Medium';
const INTER_BOLD = 'Inter_700Bold';

describe('buildPaperTheme fonts', () => {
  const theme = buildPaperTheme(MD3LightTheme, colors);

  it.each(['displayLarge', 'displayMedium', 'displaySmall'] as const)(
    '%s uses Fraunces at weight 500, matching the desktop app bar',
    (variant) => {
      expect(theme.fonts[variant].fontFamily).toBe(FRAUNCES_DISPLAY);
      expect(theme.fonts[variant].fontWeight).toBe('500');
    }
  );

  it('titleLarge is Fraunces 600 — the app bar title on every screen', () => {
    expect(theme.fonts.titleLarge.fontFamily).toBe(FRAUNCES_TITLE);
    expect(theme.fonts.titleLarge.fontWeight).toBe('600');
  });

  it('headlineMedium is Inter 700 at 28px — the page title is not Fraunces', () => {
    // `PageHeader` is `font-sans text-[28px] font-extrabold`. 700 rather than 800 because
    // the web's own 800 has no file behind it (`index.html` stops at 700).
    expect(theme.fonts.headlineMedium.fontFamily).toBe(INTER_BOLD);
    expect(theme.fonts.headlineMedium.fontWeight).toBe('700');
    expect(theme.fonts.headlineMedium.fontSize).toBe(28);
  });

  it.each(['headlineLarge', 'headlineSmall', 'bodyLarge', 'bodyMedium', 'bodySmall'] as const)(
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
