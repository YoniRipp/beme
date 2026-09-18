import React from 'react';
import { Text } from 'react-native-paper';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { PAGE_LIMIT, MAX_PAGES } from '@trackvibe/shared/api';

/** The most rows the pager will ever return — the point at which a history gets clipped. */
const HISTORY_LIMIT = PAGE_LIMIT * MAX_PAGES;

/**
 * "You are seeing part of your history, not all of it."
 *
 * Deliberately NOT `ErrorNotice`. Nothing failed: every row on screen is real and correct,
 * there is simply more of it than the pager will read in one request (critical rule 6 — a
 * request path must never read a whole history). Rendering this in the error colour, or with
 * `accessibilityRole="alert"`, would tell the user something is broken when it is not.
 *
 * The number is computed from the pager's own bounds rather than written down, so it cannot
 * drift from the limit that actually applies.
 *
 * Renders nothing when the history is complete, so a call site can pass the hook's flag
 * straight through.
 */
export function TruncationNotice({ truncated }: { truncated: boolean }) {
  const styles = useThemedStyles((colors) => ({
    notice: { color: colors.textMuted, marginBottom: 8 },
  }));

  if (!truncated) return null;

  return (
    <Text variant="bodySmall" style={styles.notice} accessibilityRole="text">
      Showing your most recent {HISTORY_LIMIT.toLocaleString()} entries. Totals and trends on
      this screen cover those, not your full history.
    </Text>
  );
}
