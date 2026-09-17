import React from 'react';
import { IconButton as PaperIconButton } from 'react-native-paper';
import { useThemedStyles } from '../../theme/useThemedStyles';

/**
 * The minimum touch target, from `agent-os/standards/frontend/mobile-ui.md`: *"Touch targets
 * ≥ 44px. Icon-only buttons still need a 44px hit area."* The web honours it —
 * `quick-tile.tsx` is `h-11 w-11`, exactly 44.
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * An icon button whose hit area is actually 44px.
 *
 * Paper sizes its container as `size + 2 * PADDING` with `PADDING = 8`
 * (`IconButton/IconButton.js`), so the `size={18}` used at every call site in this app gives
 * a 34×34 target — 10px short, on a client with no mouse to fall back on.
 *
 * The glyph stays at whatever `size` the caller asked for: the parity gap is the hit area,
 * not the icon.
 *
 * Sized through `style` rather than a `containerSize` prop — Paper 5.15's `IconButton` has no
 * such prop (the spec that asked for one predates a look at the installed typings). Paper
 * applies its own `width`/`height` first and merges `style` after, so width/height here win.
 * `borderRadius` follows at half the target to keep the ripple circular, as Paper's own does.
 *
 * Paper's default `margin: 6` is deliberately left alone: it is layout spacing between
 * controls, not part of the hit area, and zeroing it would silently retighten every row that
 * currently relies on it.
 */
type IconButtonProps = React.ComponentProps<typeof PaperIconButton>;

export function IconButton({ size = 18, style, ...rest }: IconButtonProps) {
  const styles = useThemedStyles(() => ({
    button: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      borderRadius: MIN_TOUCH_TARGET / 2,
    },
  }));

  return <PaperIconButton size={size} style={[styles.button, style]} {...rest} />;
}
