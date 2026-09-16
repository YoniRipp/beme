import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { radii, elevation, lightColors, darkColors } from '@trackvibe/shared/tokens';
import { SettingsProvider } from '../../../context/SettingsContext';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { Card } from '../Card';
import { Button } from '../Button';
import { IconButton, MIN_TOUCH_TARGET } from '../IconButton';

/**
 * What the primitives pin, and why each assertion can actually fail.
 *
 * Paper does not use `roundness` as a radius — it multiplies it (Card 3x, Button 5x), so the
 * themed `roundness: 12` renders a 36px card corner and a 60px pill button. These cases pin
 * the web's numbers against those multipliers, so "fixing" the radius by tuning `roundness`
 * shows up here rather than on a device.
 *
 * Assertions run over **every** style in the rendered subtree rather than one node's, because
 * Paper's `Surface` splits a card across `-container-outer-layer` and `-container` and puts
 * the caller's `testID` on a third, unstyled view. Matching one node by name would pin
 * Paper's internal structure; asking "does this card render a 22px corner anywhere" pins the
 * claim that matters and still fails when the primitive stops making it.
 *
 * `jest.setTimeout` and `await render` for the reason MobileGoalCard.test.tsx gives: the real
 * provider stack is mounted, and RNTL 14's render is async.
 */
jest.setTimeout(30_000);

const mount = (ui: React.ReactElement) =>
  render(
    <SettingsProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </SettingsProvider>
  );

type FlatStyle = Record<string, unknown>;

/** Every flattened style in the rendered tree, so a claim can be made about the whole card. */
function collectStyles(node: unknown, out: FlatStyle[] = []): FlatStyle[] {
  if (!node || typeof node !== 'object') return out;
  const n = node as { props?: { style?: unknown }; children?: unknown[] };
  if (n.props?.style) {
    const flat = StyleSheet.flatten(n.props.style as never) as FlatStyle | undefined;
    if (flat) out.push(flat);
  }
  (n.children ?? []).forEach((child) => collectStyles(child, out));
  return out;
}

/** All values the tree gives one style property — empty when nothing sets it at all. */
const valuesOf = (styles: FlatStyle[], prop: string) =>
  styles.filter((s) => s[prop] !== undefined).map((s) => s[prop]);

const aCard = (
  <Card testID="card">
    <Card.Content>
      <Text>body</Text>
    </Card.Content>
  </Card>
);

describe('ui/Card', () => {
  it('uses the web card radius rather than Paper 3x roundness', async () => {
    const styles = collectStyles((await mount(aCard)).toJSON());
    const radiusValues = valuesOf(styles, 'borderRadius');

    expect(radiusValues).toContain(radii.xxl);
    // The two values this defends against: Paper's 3 x roundness, and the `radius.lg` every
    // card component fell back to while the scale had no 22 step.
    expect(radiusValues).not.toContain(36);
    expect(radiusValues).not.toContain(radii.lg);
  });

  it('renders a shadow, where the Expo app previously rendered none', async () => {
    const styles = collectStyles((await mount(aCard)).toJSON());

    expect(valuesOf(styles, 'shadowOpacity')).toContain(elevation.sm.opacity);
    expect(valuesOf(styles, 'shadowRadius')).toContain(elevation.sm.blur / 2);
    expect(valuesOf(styles, 'elevation')).toContain(elevation.sm.android);
  });

  it('takes its shadow colour from the palette rather than a hardcoded black', async () => {
    const styles = collectStyles((await mount(aCard)).toJSON());
    const shadowColors = valuesOf(styles, 'shadowColor');

    // Whichever scheme the provider resolves, the colour has to be the palette's `shadow`
    // role — `#3d3229` in light, `#000000` in dark. Paper's own untouched layers use the
    // 3-digit `#000`, so a primitive that forgot to pass a colour fails here.
    expect([lightColors.shadow, darkColors.shadow]).toContain(
      shadowColors.find((c) => c === lightColors.shadow || c === darkColors.shadow)
    );
  });

  it('keeps the hairline border the web card carries alongside its shadow', async () => {
    const styles = collectStyles((await mount(aCard)).toJSON());

    expect(valuesOf(styles, 'borderWidth')).toContain(1);
  });

  it('lets a caller override what it pins', async () => {
    // Adoption has to be able to keep a local exception without forking the primitive.
    const tree = await mount(
      <Card testID="card" style={{ borderRadius: radii.sm }}>
        <Card.Content>
          <Text>body</Text>
        </Card.Content>
      </Card>
    );

    expect(valuesOf(collectStyles(tree.toJSON()), 'borderRadius')).toContain(radii.sm);
  });
});

describe('ui/Button', () => {
  it('uses the web button radius rather than Paper 5x roundness', async () => {
    const tree = await mount(
      <Button testID="btn" mode="contained">
        Save
      </Button>
    );
    const radiusValues = valuesOf(collectStyles(tree.toJSON()), 'borderRadius');

    expect(radiusValues).toContain(radii.md);
    // 5 x roundness = 60, which clamps to a full pill on a ~40px control.
    expect(radiusValues).not.toContain(60);
  });
});

describe('ui/IconButton', () => {
  it('gives the glyph a 44px hit area instead of Paper 34', async () => {
    const tree = await mount(<IconButton testID="icon" icon="pencil" size={18} />);
    const styles = collectStyles(tree.toJSON());

    expect(valuesOf(styles, 'width')).toContain(MIN_TOUCH_TARGET);
    expect(valuesOf(styles, 'height')).toContain(MIN_TOUCH_TARGET);
    // Paper computes `size + 2 * PADDING` with PADDING = 8, so size 18 gives exactly 34.
    expect(valuesOf(styles, 'width')).not.toContain(34);
  });

  it('leaves the glyph at the size the caller asked for', async () => {
    const tree = await mount(<IconButton testID="icon" icon="pencil" size={18} />);
    const styles = collectStyles(tree.toJSON());

    // The icon renders as text at `fontSize: size`. Growing the target must not grow the
    // glyph — `size={44}` would be the wrong fix and would show up right here.
    expect(valuesOf(styles, 'fontSize')).toContain(18);
    expect(valuesOf(styles, 'fontSize')).not.toContain(MIN_TOUCH_TARGET);
  });
});
