# Plan — Every Tab Opens at the Top

Status: **built**. Tasks 2-5 are implemented on `claude/ios-sweep-tab-scroll-position`; Task 6
no longer has a runnable target — see the note under it.

The bug in `shape.md` reproduces and the diagnosis is right. Two supporting claims in it are
wrong; they are corrected in Task 0 before anything is built on them.

## Task 0 — Verify the claims in `shape.md` against the code

- [x] **True — React Router does not reset scroll.** `frontend/src/routes.tsx:235` mounts
      `<BrowserRouter>`; nothing in the tree scrolls on navigation.
- [x] **True — nothing already does this.** `ScrollRestoration` appears nowhere.
      `grep -rn "scrollTo\|scrollIntoView\|scrollTop\|scrollRestoration" frontend/src` returns
      five hits and none is a route reset: two chat panels scrolling their own message list to
      the bottom, `ExercisePickerSheet.tsx:219` resetting its own list, and the two
      `window.scrollY` header listeners in `Base44Layout.tsx:105` and `marketing/Navbar.tsx:17`.
- [x] **True — `Base44Layout` already has a `pathname` effect.** Lines 110-112, closing the
      sidebar. It is the right neighbour for this, and the layout is a route-level element
      (`routes.tsx:94`) so it does *not* remount between tabs — its effects see every tab
      switch. Confirmed hook point.
- [x] **False — "the desktop layout scrolls a different element."** There is one scroller at
      every breakpoint: the document. Nothing in `Base44Layout`, `PublicLayout` or any page
      sets `overflow-y-auto` / `h-screen`; the shell is `min-h-screen` (`:147`) wrapping
      `lg:ml-72 min-h-screen` (`:216`) wrapping a `<main>` with no height constraint. `lg:ml-72`
      is a margin, not a scroll container. The proof is in the file itself: the desktop
      header's glass state is driven by `window.scrollY` at line 105 and it works, which it
      could not if desktop scrolled an inner element. **Consequence: there is no
      element-vs-window branch to write. `window` is the target, everywhere.**
- [x] **Overstated — "on the web this is masked."** It is less *noticeable* on desktop (taller
      viewport, sidebar navigation, shorter pages relative to the fold), not masked. The same
      bug is live on desktop web and in the PWA today.
- [x] **Accurate — the Energy hero.** `pages/Energy.tsx:416-421`: the period selector
      (`daily | weekly | monthly | yearly`, line 380) sits above a 132px calorie ring inside the
      `md:hidden` card. Scrolling past it is exactly the reported symptom.

### Two hazards the code adds that `shape.md` does not mention

- [x] **`html { scroll-behavior: smooth }`** — `frontend/src/index.css:195-197`. This makes the
      obvious fix actively worse than the bug: `window.scrollTo(0, 0)`, `window.scrollTo({ top: 0 })`
      and `document.documentElement.scrollTop = 0` all scroll with behavior `auto`, which
      resolves to the CSS property, so every tab switch would *animate* a smooth scroll up
      through the incoming page. Only an explicit `behavior: 'instant'` overrides it.
      (`ScrollBehavior` in the installed TypeScript 5.9 lib.dom is
      `"auto" | "instant" | "smooth"` — no cast needed.)
- [x] **`ios: { contentInset: 'automatic' }`** — `frontend/capacitor.config.ts:7`. The iOS shell
      lets WKWebView adjust the scroll view for the safe area, so "the top" in the native shell
      is offset 0 of the document under an adjusted inset. `window.scrollTo` maps onto it
      correctly; no native-only branch is needed, but it is why device verification is required
      rather than optional.

## Task 1 — Save spec documentation

- [x] `shape.md` — the report from the iOS click sweep (pre-existing; a "Corrections" section
      was appended, nothing was rewritten)
- [x] `standards.md` — which standards apply and the points carried into the work
- [x] `plan.md` — this file

## Task 2 — Decide the behaviour: reset, not per-tab restore

**Decision: scroll to top on PUSH and REPLACE; leave POP to the browser.** Recorded here so
the implementer does not have to re-argue it.

- [x] **Ship plain reset.** Every `PUSH`/`REPLACE` navigation puts the document at offset 0.
      This is acceptance criterion 1 read literally: *every* tab opens at the top, including
      one you have visited before.
- [x] **Do not build per-tab restoration.** Four reasons, in order of weight:
      1. *It is the wrong model for these screens.* iOS restores per tab because a tab is a
         navigation **stack** whose content is stable while you are away. TrackVibe's tabs are
         live date-scoped dashboards — a voice log, a synced workout or a date rollover changes
         the list under you. Restoring a pixel offset into a list that grew by two cards lands
         you somewhere arbitrary, which reads as a bug, not as memory.
      2. *There is nothing to restore against at navigation time.* Routes are lazy
         (`routes.tsx:12-26`) and their height arrives after React Query settles. Faithful
         restoration needs a `ResizeObserver`/rAF retry loop with a height target, a timeout,
         and an abort-if-the-user-scrolls guard — stateful shell code whose failure mode is
         intermittent and network-dependent.
      3. *The library's own answer is not available here.* React Router 6.30.6's
         `<ScrollRestoration>` is data-router only. Reaching it means replacing
         `<BrowserRouter>` + nested auth-gated `<Routes>` (`routes.tsx:233-325`,
         `ProtectedRoutes` at `:57`) with `createBrowserRouter` + `RouterProvider` — a routing
         rewrite to fix a scroll bug, against critical rule 1.
      4. *Reset is a strict improvement and does not close the door.* `shape.md` says as much.
         If users ask for memory later it can be added per tab, behind the same hook, keyed
         by tab rather than by history entry.
- [x] **Browser back/forward: do not touch it.** Skip the reset when
      `useNavigationType() === 'POP'`. `history.scrollRestoration` defaults to `'auto'`, so
      Safari/WKWebView and Chrome already restore the offset they recorded for that history
      entry. Not fighting them satisfies acceptance criterion 2 exactly as worded — "where a
      browser would" — and keeps the PWA and the web app behaving like the web. It is also the
      honest reason not to hand-roll a `POP`-aware store: the platform already has one, and on
      a page whose height arrives asynchronously the platform's is the better of the two.
- [x] **`REPLACE` resets.** A `<Navigate replace>` (`routes.tsx:69`, `:83`) lands on a
      different page; it should start at the top.

## Task 3 — `useScrollToTopOnNavigate`

New file: `frontend/src/hooks/useScrollToTopOnNavigate.ts`.

- [x] Signature `useScrollToTopOnNavigate(): void`. No arguments, no state, no return value.
- [x] Reads `const { pathname } = useLocation()` and `const navigationType = useNavigationType()`,
      both from `react-router-dom`.
- [x] **`useLayoutEffect`, not `useEffect`.** With `v7_startTransition: true` (`routes.tsx:235`)
      the location context commits together with the new route's content, so a `useEffect`
      would let the browser paint the new page at the old offset for one frame — a visible
      flash of mid-page content before it snaps. A layout effect runs before that paint.
- [x] Effect body, in this order:
      1. `if (navigationType === 'POP') return;`
      2. `window.scrollTo({ top: 0, left: 0, behavior: 'instant' })`, wrapped so an old WebView
         that rejects the `'instant'` enum member falls back to `window.scrollTo(0, 0)`.
         `'instant'` is mandatory — see Task 0's `scroll-behavior: smooth` hazard.
      3. Guard the whole thing with `typeof window !== 'undefined'`, matching the defensive
         style of `hooks/useMediaQuery.ts:4-7`.
- [x] **The lazy-route timing question, answered.** Nothing extra is needed, and the reason is
      worth writing down so nobody adds a `setTimeout` later. Scrolling *to zero* is the one
      target that cannot be defeated by an unknown page height: if the incoming route is still
      its `<Suspense>` spinner the document is short and the browser has already clamped the
      offset to 0, and when the real content mounts and the page grows, scroll anchoring is
      spec-disabled at offset 0 (and unimplemented in WebKit regardless), so nothing pulls the
      user back down. The height race is fatal only for *restoring* a non-zero offset — which
      Task 2 declined. Do not add a `requestAnimationFrame` or a timeout; either would move the
      scroll after paint and reintroduce the flash the layout effect exists to prevent.
- [x] Dependency array `[pathname, navigationType]`. Deliberately **not** the whole `location`
      object. Two notes, one of them a free feature:
      - `location` changes identity on every navigation *including a push to the path you are
        already on*, so keying on `location.key` would additionally scroll to top when you tap
        the tab you are already viewing — which is the native tab-bar behaviour listed under
        "Deliberately not done" below. That is a genuine one-word upgrade if it is wanted, but
        it is a behaviour change and should be decided, not inherited.
      - Depending on `pathname` also keeps a future `?tab=`-style sub-view from yanking the
        user to the top. No page uses search params for sub-views today (only `Signup` and
        `AuthCallback` read them, both outside these layouts) — this is future-proofing, not a
        fix for an existing case, and it should not be described as one.
- [x] Doc comment covering: which element scrolls and why (`window`, one document scroller at
      every breakpoint), why `'instant'`, why `POP` is skipped, and why zero needs no timing
      dance. That is four non-obvious constraints in fifteen lines — the comment is part of the
      deliverable.
- [x] **Do not** add a scroll container, change `index.css`, or remove
      `html { scroll-behavior: smooth }`. Its only in-app consumer is `pages/Landing.tsx`
      (`href="#pricing"`, `href="#main-content"`), currently an unreachable route — but
      deleting a global CSS rule to work around a call site is the wrong direction, and
      `behavior: 'instant'` already handles it locally.

## Task 4 — Wire it into the two shells

- [x] `frontend/src/components/layout/Base44Layout.tsx` — call `useScrollToTopOnNavigate()`
      immediately above the existing sidebar effect at line 110, so the two `pathname`
      reactions read together. One added import, one added line; nothing else in this file
      changes.
- [x] `frontend/src/components/layout/PublicLayout.tsx` — same call. The marketing pages have
      the identical bug (Pricing → About keeps the offset) and the file is currently a
      nine-line pure-JSX shell, so this is where the shared hook pays for itself.
- [x] Do **not** call it inside individual pages. Two shells, two call sites; a page-level call
      would fire on every remount, not on every navigation.
- [x] Leave `Login`, `Signup`, `ForgotPassword` and `AuthCallback` alone — they render outside
      both layouts (`routes.tsx:237-268`) and are single-screen forms with nothing to scroll.

## Task 5 — Tests

- [x] `frontend/src/setupTests.ts` — stub `window.scrollTo` alongside the existing
      `scrollIntoView` stub at lines 14-17. jsdom does not implement it and logs a
      `Not implemented: window.scrollTo` error on every render of either shell, which would
      pollute the whole suite, not just the new tests. ~~Use the same
      `if (typeof … !== 'function')` guard style as its neighbours.~~ **Corrected while
      building:** that guard would never fire. jsdom 23 *does* define `window.scrollTo` — as a
      writable, configurable function that emits the "Not implemented" error when called — so
      the stub is assigned unconditionally, with a comment saying why it breaks the local
      pattern.
- [x] `frontend/src/hooks/useScrollToTopOnNavigate.test.tsx` — co-located per `global/testing`.
      Render the hook inside a `MemoryRouter` with
      `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` (matching
      `Base44Layout.test.tsx:32`) and a `vi.spyOn(window, 'scrollTo')`. Cases:
      - [x] scrolls to top when the pathname changes
      - [x] passes `behavior: 'instant'` — asserted explicitly, because dropping it is the
            regression that reintroduces the smooth-scroll animation and nothing else would
            catch it
      - [x] does **not** scroll on `POP` — drive it with a real history back through
            `MemoryRouter`, not by mocking `useNavigationType`, so the assertion covers the
            wiring rather than the mock
      - [x] does **not** scroll when only the search string changes on the same pathname
- [x] `frontend/src/components/layout/Base44Layout.test.tsx` — one integration case: click the
      Food tab in the bottom nav and assert `window.scrollTo` was called. The existing
      `renderLayout()` helper only registers `/`; extend it to register `/energy` too. Do not
      restructure the file — its four nav tests stay as they are.
- [x] `frontend/e2e/dashboard.spec.ts` — add the real-browser case to the existing
      `Mobile bottom navigation` describe (390×844 viewport). **Be honest that this does not
      run**: that describe is `test.describe.skip` because route interception cannot get past
      the auth gate, as its own comment at lines 51-56 explains. Write it so it passes the day
      authenticated E2E is wired, and note that `signIn()` stubs every list endpoint empty —
      the `/body` stub must return enough workouts to make the page taller than the viewport,
      or `window.scrollTo(0, 500)` is a no-op and the test asserts nothing.
- [x] `cd frontend && npm run test -- --run` and `npx tsc --noEmit`.

## Task 6 — Verify on device (superseded)

**Superseded while building.** This task was written against the Capacitor shell in
`frontend/`, and `main` has since retired it: per the root `CLAUDE.md`, no CI job builds it,
`frontend/ios/` is not in the repo, and its `@capacitor/cli` is a major behind its runtime, so
`npm run cap:ios` does not produce a project that compiles from a clean checkout. Native work
now lives in `mobile/` (Expo), which does not use this hook — it has its own navigator.

So there is no iOS shell to walk this list in, and the acceptance criterion it came from is no
longer reachable from this package. What remains verifiable is the browser and PWA behaviour,
which is what the fix ships for. The list is kept below for whoever ports the equivalent to
`mobile/`.

- [ ] `npm run build && npm run cap:sync && npm run cap:ios`, iPhone 17 Pro simulator.
- [ ] The reported repro: Workouts → scroll down → Food. Food opens at its calorie ring with
      no visible scroll animation.
- [ ] All twelve ordered pairs of the four tabs, each from a scrolled position.
- [ ] Re-entry: Home → Workouts → scroll → Home → Workouts. Opens at the top (the accepted
      cost of choosing reset over restore).
- [ ] Sidebar links (Goals, Insights, Water) reset too — they go through the same hook.
- [ ] Swipe-back from a scrolled page returns to the previous page's remembered offset. If
      WKWebView does not restore it, record that as a known platform limitation rather than
      adding a manual store — see Task 2.
- [ ] Desktop web at ≥1024px: the header's glass border still appears on scroll and clears
      when a tab switch returns to 0.
- [ ] Marketing pages in a browser: Pricing → About lands at the top.
- [ ] Both themes, and with Reduce Motion on (`index.css:368-375` already forces
      `scroll-behavior: auto`, so `'instant'` is a no-op there — confirm nothing regresses).

## Verification

- [x] `cd frontend && npx tsc --noEmit` — clean
- [x] `cd frontend && npm run test -- --run` — all green: 39 files, 262 tests, including the
      four new hook tests and one new layout test
- [x] `cd frontend && npm run build` — clean
- [x] No backend change, so no backend run is required
- [ ] Task 6 — superseded, see the note under it

## Deliberately not done

- **Per-tab scroll restoration.** Task 2 carries the reasoning. Revisit only if users ask for
  it, and only keyed by tab, never by history entry.
- **Migrating to `createBrowserRouter` / `RouterProvider`.** It is the only way to reach
  React Router's own `<ScrollRestoration>`, and it is a routing rewrite for a scroll bug.
- **Any change to `html { scroll-behavior: smooth }`.** Handled locally with
  `behavior: 'instant'`.
- **Tap-the-active-tab-to-scroll-to-top.** Genuinely native, genuinely nice, and — per Task 3 —
  one dependency-array word away. Out of scope because it is a new behaviour rather than a fix,
  and because it deserves its own look at whether the tabs stay plain `<Link>`s (middle-click,
  long-press, screen readers) while gaining it. Worth a follow-up shape.
- **Focus management on navigation.** Moving focus to the new page heading is the a11y
  companion to a scroll reset and belongs with it eventually, but it changes keyboard and
  screen-reader behaviour app-wide and should not ride along silently.
- **`viewport-fit=cover`.** `frontend/index.html:7` omits it, which means `env(safe-area-inset-*)`
  — and therefore `.pb-safe` on the bottom nav — resolves to 0 in mobile Safari and the PWA.
  Noticed while tracing the scroller. It is unrelated to scroll position and almost certainly
  belongs to the companion status-bar task from the same sweep; filed here so it is not lost.
