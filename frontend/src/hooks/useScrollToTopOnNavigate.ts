import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Puts the document back at the top when the route changes.
 *
 * Without this, switching bottom-nav tabs opens the next screen at the previous screen's
 * offset — React Router does not reset scroll, and nothing else in the tree does either.
 *
 * Called by the two shells, `Base44Layout` and `PublicLayout`. Nothing else should call it:
 * a page-level call would fire on every remount rather than on every navigation.
 *
 * Four details here are load-bearing and easy to undo by accident.
 *
 * 1. **`window` is the target, at every breakpoint.** The document is the app's only
 *    scroller. No layout or page sets `overflow-y-auto` or `h-screen`, and `lg:ml-72` on the
 *    desktop shell is a margin, not a scroll container — which is why the desktop header can
 *    drive its glass state off `window.scrollY`. There is no element-vs-window branch to add.
 * 2. **`behavior: 'instant'` is mandatory.** `index.css` sets `html { scroll-behavior: smooth }`,
 *    and every default form of the call — `scrollTo(0, 0)`, `scrollTo({ top: 0 })`,
 *    `documentElement.scrollTop = 0` — resolves its `auto` behaviour to that CSS property. Drop
 *    the explicit `'instant'` and each tab switch animates a scroll up through the incoming
 *    page, which is worse than the bug this fixes.
 * 3. **`POP` is skipped.** Browser and PWA back/forward keep the platform's own restoration:
 *    `history.scrollRestoration` defaults to `'auto'`, and on screens whose height only arrives
 *    with their data, the platform restores better than we could. This also covers the first
 *    render, whose navigation type is `POP` — a reload keeps the offset the browser recorded.
 * 4. **No `setTimeout`, no `requestAnimationFrame`.** Routes are lazy, so the incoming page's
 *    height lands after this runs — but zero is the one offset that cannot lose that race. A
 *    page still showing its Suspense fallback is short, so the browser has already clamped the
 *    offset to 0, and scroll anchoring does not engage there. Deferring the call would only
 *    move the scroll after paint and reintroduce the flash `useLayoutEffect` exists to avoid.
 *
 * Scrolling to the top of a screen you have visited before is intentional: these tabs are
 * live, date-scoped dashboards, so a remembered pixel offset lands somewhere arbitrary once a
 * voice log or a synced workout has changed the list underneath it.
 */
export function useScrollToTopOnNavigate(): void {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  // A layout effect, not an effect: with `v7_startTransition` the new location commits
  // together with the new page, so an effect would let the browser paint that page at the
  // old offset for a frame before snapping it back.
  useLayoutEffect(() => {
    if (navigationType === 'POP') return;
    if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') return;

    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch {
      // Older WebViews predate `'instant'` in the ScrollBehavior enum and throw on it. The
      // two-argument form is universally supported; it animates under the global
      // `scroll-behavior: smooth`, which is still better than not resetting at all.
      window.scrollTo(0, 0);
    }
    // Keyed on the pathname rather than the whole location, so that a future `?tab=`-style
    // sub-view does not yank the user to the top of the page they are already reading.
  }, [pathname, navigationType]);
}
