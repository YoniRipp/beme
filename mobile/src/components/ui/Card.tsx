import React from 'react';
import { Card as PaperCard } from 'react-native-paper';
import { shadowStyle } from '@trackvibe/shared/tokens';
import { radius } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

/**
 * The card surface, mirroring `frontend/src/components/ui/card.tsx`:
 *
 *   rounded-2xl border border-border bg-card shadow-card
 *
 * which is `borderRadius: radii.xxl` (22), a 1px `border` hairline, the plain `surface`
 * fill, and the `sm` step of the elevation scale.
 *
 * **Why this exists at all.** Four components — `MetricCard`, `MobileFoodCard`,
 * `MobileGoalCard`, `MobileWorkoutCard` — each re-declared the same three style lines in
 * their own `StyleSheet`, all landing on `radius.lg` (14) because the scale had no 22 step.
 * That is four copies of `card.tsx` with no `card.tsx`, which is the mobile form of the
 * styled `<div>` that `agent-os/standards/frontend/components.md` calls a bug.
 *
 * **Why the radius is pinned here rather than on the Paper theme.** Paper does not use
 * `roundness` as a radius; `Card` multiplies it by 3 (`Card/Card.js`), so `roundness: 12`
 * renders a 36px corner. No value of `roundness` fixes that, because each Paper component
 * multiplies by a different fixed factor — see `buildPaperTheme`'s docstring for the table.
 * A style on the component wins over Paper's internal value, so that is where the web's
 * number goes.
 *
 * `mode` defaults to `contained` because Paper's default `elevated` mode paints its own
 * tonal background; the web's card is a flat surface plus a shadow, not a tinted one.
 */
/**
 * Paper types `Card`'s props as a union discriminated on `mode` (`outlined` forbids the
 * `elevation` the other arms allow), so re-passing a `mode` typed as the whole union does not
 * narrow to any one arm. One cast at the Paper boundary is cheaper and clearer than
 * reproducing the union; we never pass `elevation`, which is the only thing the arms disagree
 * about.
 */
type CardProps = React.ComponentProps<typeof PaperCard>;

function CardBase({ style, mode = 'contained', ...rest }: CardProps) {
  const styles = useThemedStyles((colors) => ({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderColor: colors.border,
      // Android ignores every field here except `elevation`, so the web's warm shadow hue
      // only ever reaches iOS. That is a platform limit, not a mapping mistake.
      ...shadowStyle('sm', colors.shadow),
    },
  }));

  const paperProps = { ...rest, mode, style: [styles.card, style] } as CardProps;
  return <PaperCard {...paperProps} />;
}

/**
 * The sub-components come along unchanged, so `ui/Card` is a drop-in for Paper's `Card` at
 * every existing `<Card.Content>` call site. Without this, adopting the primitive would mean
 * editing the children too, and a migration that touches more than the import is a migration
 * people skip.
 */
export const Card = Object.assign(CardBase, {
  Content: PaperCard.Content,
  Actions: PaperCard.Actions,
  Title: PaperCard.Title,
  Cover: PaperCard.Cover,
});
