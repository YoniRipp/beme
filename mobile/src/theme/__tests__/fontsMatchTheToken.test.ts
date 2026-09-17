import { typeFaces } from '@trackvibe/shared/tokens';
import { fonts } from '../../theme';

/**
 * `fonts` is derived from the shared token, and this is what stops it drifting back.
 *
 * The token used to export `fontFamily = { sans: 'Inter', serif: 'Fraunces' }` — the CSS
 * names, which Expo cannot use, because it registers a face as `Inter_400Regular`. So
 * `theme.ts` declared its own constant, the token went unimported by anything for its whole
 * life, and the two vocabularies had no relationship at all. That is the state this pair of
 * assertions exists to prevent returning to.
 *
 * The family strings also have to be exactly what `App.tsx` passes to `useFonts()`. A
 * mismatch there fails **silently** into the platform's system face — there is no error, the
 * text simply renders in SF Pro or Roboto and looks approximately right in a screenshot.
 */
describe('mobile fonts and the shared token', () => {
  it('names every face the token defines, and no others', () => {
    expect(Object.keys(fonts).sort()).toEqual(Object.keys(typeFaces).sort());
  });

  it('uses the token’s Expo family for each role', () => {
    for (const [role, face] of Object.entries(typeFaces)) {
      expect(fonts[role as keyof typeof fonts]).toBe(face.expo);
    }
  });

  it('carries no weight the app has not loaded', () => {
    // Deliberately no 800: the web's own font-extrabold is unbacked, so matching it with a
    // real 800 face would render mobile heavier than the reference.
    const weights = Object.values(typeFaces).map((f) => f.weight);
    expect(weights).not.toContain(800);
    expect(new Set(weights)).toEqual(new Set([400, 500, 600, 700]));
  });
});
