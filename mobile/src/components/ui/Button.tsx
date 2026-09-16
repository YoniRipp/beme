import React from 'react';
import { Button as PaperButton } from 'react-native-paper';
import { radius } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

/**
 * The button, mirroring `frontend/src/components/ui/button.tsx`, whose base class string is
 * `rounded-md` — `radii.md`, 12.
 *
 * Paper's `Button` multiplies `roundness` by 5 (`Button/Button.js`), so the themed
 * `roundness: 12` renders 60, which on a ~40px-tall control clamps to a full pill. The web's
 * button is a gently rounded rectangle. Pinning the radius in a style overrides Paper's
 * internal value; changing `roundness` cannot, because `Card` (×3) and `Dialog` (×7) read the
 * same constant and would move the wrong way.
 *
 * Covers the three modes in use — `contained`, `contained-tonal`, `outlined` — by not
 * constraining `mode` at all; the radius is the same for all of them on the web.
 */
type ButtonProps = React.ComponentProps<typeof PaperButton>;

export function Button({ style, ...rest }: ButtonProps) {
  const styles = useThemedStyles(() => ({
    button: {
      borderRadius: radius.md,
    },
  }));

  return <PaperButton style={[styles.button, style]} {...rest} />;
}
