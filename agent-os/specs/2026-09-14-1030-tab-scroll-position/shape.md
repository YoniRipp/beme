# Switching bottom-nav tabs keeps the previous screen's scroll position

Status: **not started** — filed from the iOS simulator click sweep of 2026-09-14.
Severity: **medium** — every tab switch after the first scroll lands you mid-page.

## The mismatch

On iPhone 17 Pro (iOS 26.5):

1. Tap **Workouts**, swipe up to scroll down the page
2. Tap **Food**

Food opens **already scrolled** to the same offset. Its hero — the calorie ring and the
Daily / Weekly / Monthly / Yearly selector — is above the viewport; the first thing on
screen is the middle of the page. The page heading is off-screen entirely (which is also
what makes the status-bar collision in the companion task so visible).

Expected: each tab opens at the top, the way every native tab bar behaves.

## Why it happens

React Router does not reset scroll on navigation, and there is no `ScrollRestoration` or
scroll-to-top effect in the app shell. On the web this is masked — the desktop layout
scrolls a different element and pages are shorter relative to the viewport — but in the
native shell, where the four tabs are the primary navigation and pages are long, you hit
it constantly.

`Base44Layout` already has a `useEffect` keyed on `pathname` (it closes the sidebar
drawer), so there is an obvious place for this.

## Fix

Scroll the document to the top on pathname change. Worth deciding at the same time
whether tabs should *remember* their own scroll offset — the native-feeling behaviour is
per-tab restoration, where returning to Workouts puts you back where you were, while a
fresh tab starts at the top. The simple always-reset is a strictly better starting point
than today's shared-offset behaviour either way.

## Acceptance criteria

- [ ] Every bottom-nav tab opens at the top of its page
- [ ] Back/forward still restore position where a browser would
- [ ] Verified in the iOS shell, not just the browser

## Corrections after reading the code (2026-09-14)

Appended during planning; the report above is left as written. Full detail in `plan.md`, Task 0.

- **"the desktop layout scrolls a different element" is wrong.** There is one scroller at
  every breakpoint — the document. No `overflow-y-auto` or `h-screen` exists anywhere in
  `Base44Layout`, `PublicLayout` or the pages; `lg:ml-72` is a margin. `Base44Layout.tsx:105`
  reads `window.scrollY` to drive the desktop header, which only works because desktop scrolls
  the window too. So there is no element-vs-window branch to write.
- **"on the web this is masked" is overstated.** Less noticeable on desktop, not masked. The
  same bug ships in the browser and the PWA today.
- Everything else checks out: no `ScrollRestoration`, no scroll-to-top, the `pathname` effect
  at `Base44Layout.tsx:110-112` is the right hook point, and the Energy hero is where the
  report says it is.
- **Two hazards the report misses.** `index.css:195` sets `html { scroll-behavior: smooth }`,
  so `window.scrollTo(0, 0)` would *animate* the reset — `behavior: 'instant'` is mandatory.
  And `capacitor.config.ts` sets `ios: { contentInset: 'automatic' }`, which is why the iOS
  shell has to be re-checked rather than assumed from the browser.
