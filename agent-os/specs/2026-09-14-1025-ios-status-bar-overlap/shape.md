# Scrolled content renders on top of the iOS status bar

Status: **not started** — filed from the iOS simulator click sweep of 2026-09-14.
Severity: **high** — it is on every scrollable screen and it is the first thing you see.

## The mismatch

Scroll any app screen down in the iOS shell and the page heading is painted **across the
status bar**, colliding with the system clock.

Reproduced on iPhone 17 Pro (iOS 26.5):

1. Sign in, tap **Workouts**
2. Swipe up to scroll
3. "BODY / **Workouts**" is drawn over the top of the screen, with the `9:45` clock
   showing through the letters

Same on **Food** — "ENERGY / Food log" sits across the clock. The sticky in-app header
(`☰ Workouts 👤`) renders correctly *below* it, so you get the page title twice: once
correctly in the header, once smeared over the status bar.

A further tell: when the Voice Agent sheet is open, its scrim dims the whole page **but
not that heading** — the text is outside the area the WebView is dimming, because it is
in the status-bar strip.

## Why it happens

Two things compound:

**1. `viewport-fit=cover` is missing.** `frontend/index.html:7`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

Without `viewport-fit=cover`, iOS resolves every `env(safe-area-inset-*)` to `0`. That
makes the app's whole safe-area vocabulary inert on iOS:

- `.pb-safe` / `.pt-safe` (`frontend/src/index.css:245-246`) resolve to `padding: 0`
- `BottomNavigation.tsx:44` relies on `pb-safe` for the home-indicator gap
- the AI Coach FAB's `bottom-[calc(env(safe-area-inset-bottom,0px)+9.75rem)]`
  (`Base44Layout.tsx`) silently falls back to the bare `9.75rem`

`BottomNavigation.test.tsx:41` asserts the `pb-safe` class is present — a test that
passes while the behaviour it stands for does nothing on the target platform.

**2. `ios: { contentInset: 'automatic' }`** in `capacitor.config.ts` lets the scroll view
extend content above the top inset, which is what puts the heading in the status bar
rather than clipping it.

## Fix

Add `viewport-fit=cover` and then actually honour the insets — a `pt-safe` (or
`padding-top: env(safe-area-inset-top)`) on the sticky mobile header in `Base44Layout`,
and a review of `contentInset` now that the insets report real values. Changing only the
meta tag without the padding will make the collision *worse*, so the two go together.

## Acceptance criteria

- [ ] No page content is ever drawn in the status-bar strip, at any scroll offset
- [ ] The bottom bar clears the home indicator on a notched device
- [ ] `env(safe-area-inset-top/bottom)` report non-zero in the iOS shell
- [ ] Checked on both a notched device and a non-notched one (SE)
