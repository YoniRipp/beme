import { PAGE_LIMIT, MAX_PAGES } from '@trackvibe/shared/api';

/** The most rows the pager will ever return — the point at which a history gets clipped. */
const HISTORY_LIMIT = PAGE_LIMIT * MAX_PAGES;

/**
 * "You are seeing part of your history, not all of it."
 *
 * Deliberately not routed through `ContentWithLoading`'s `error` prop. Nothing failed: every
 * row on screen is real, there is simply more of it than the pager reads in one request
 * (critical rule 6 — a request path must never read a whole history). Rendering it in
 * `text-destructive`, or with `role="alert"`, would report a fault where there is none.
 *
 * The number comes from the pager's own bounds rather than being written down, so the copy
 * cannot drift from the limit that actually applies.
 *
 * Mirrors `mobile/src/components/shared/TruncationNotice.tsx`.
 */
export function TruncationNotice({ truncated }: { truncated: boolean }) {
  if (!truncated) return null;

  return (
    <p className="text-sm text-muted-foreground mb-2" data-testid="truncation-notice">
      Showing your most recent {HISTORY_LIMIT.toLocaleString()} entries. Totals and trends on
      this page cover those, not your full history.
    </p>
  );
}
