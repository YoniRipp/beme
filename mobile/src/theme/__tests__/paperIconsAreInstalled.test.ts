import fs from 'fs';
import path from 'path';

/**
 * Every icon in this app is drawn by `react-native-paper`, which resolves its glyph font at
 * runtime by `require`-ing whichever icon library it finds installed — `@expo/vector-icons`
 * first (`react-native-paper/lib/commonjs/components/MaterialCommunityIcon.js`). When none is
 * present it does NOT throw: it warns once to the console and renders every icon as an empty
 * box. The app keeps working, the tests keep passing, and the entire UI silently loses its
 * icons — the tab bar, the quick-log cards, every affordance.
 *
 * That is exactly what shipped. Under SDK 54 `@expo/vector-icons` arrived transitively via
 * `expo` and nothing declared it, so it sat hoisted in the tree looking like a dependency.
 * SDK 57 stopped pulling it in, `npm dedupe` collected it, and it vanished from the install
 * entirely — 410 tests still green, `tsc --noEmit` still clean, every glyph a tofu box. The
 * regression was only visible by looking at a running screen.
 *
 * So this guard asserts BOTH halves, because the resolvable half alone would have passed
 * before the break too — it was resolvable right up until the version bump that dropped it:
 *
 *   1. It resolves, so Paper's `require` finds it.
 *   2. It is declared in this package's own `dependencies`, so it cannot evaporate again the
 *      next time a transitive provider stops providing it. This is the half that matters.
 */

const ICON_PACKAGE = '@expo/vector-icons';

describe('react-native-paper icon library', () => {
  it('resolves the module Paper requires for its glyphs', () => {
    expect(() => require.resolve(`${ICON_PACKAGE}/MaterialCommunityIcons`)).not.toThrow();
  });

  it('is a declared dependency, not one inherited from whatever expo happens to ship', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8')
    ) as { dependencies?: Record<string, string> };

    expect(Object.keys(pkg.dependencies ?? {})).toContain(ICON_PACKAGE);
  });
});
