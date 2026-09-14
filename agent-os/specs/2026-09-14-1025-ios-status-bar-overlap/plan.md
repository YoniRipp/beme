# Plan — Scrolled content renders on top of the iOS status bar

Status: **planned, not implemented.** Docs only on this branch — no application code or CSS
is touched by the commit that adds this file.

The finding in `shape.md` is **valid** and the diagnosis is correct. What follows verifies
it line by line against the code on this branch, corrects four places where it is
incomplete, and sequences the fix — because the headline change (`viewport-fit=cover`) makes
the bug **worse** if it ships on its own.

---

## Verified against the code

| Claim in `shape.md` | Verdict |
|---|---|
| `frontend/index.html:7` has no `viewport-fit=cover` | **Confirmed.** `content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"` |
| `frontend/capacitor.config.ts` sets `ios: { contentInset: 'automatic' }` | **Confirmed**, lines 7–9 |
| `.pb-safe` / `.pt-safe` at `frontend/src/index.css:245-246` | **Confirmed**, exact lines |
| `BottomNavigation.tsx:44` relies on `pb-safe` | **Confirmed** — `"fixed bottom-0 left-0 right-0 z-30 lg:hidden pointer-events-none pb-safe"` |
| The AI FAB uses `bottom-[calc(env(safe-area-inset-bottom,0px)+9.75rem)]` | **Confirmed**, `Base44Layout.tsx:333` |
| `BottomNavigation.test.tsx:41` asserts `pb-safe` and passes while the behaviour is inert | **Confirmed** |
| The offending heading is the page's own `PageHeader`, not the shell header | **Confirmed** — `Body.tsx:196` renders `<PageHeader kicker="Body" title="Workouts" …>` inside the scrolling `<main>` (`Base44Layout.tsx:301`); `Energy.tsx:369` is the "Food log" one. The shell's `<h2>{pageTitle}</h2>` at `Base44Layout.tsx:228` is the correct copy, which is why the title appears twice. |
| The sticky mobile header has no top padding | **Confirmed** — `Base44Layout.tsx:218` is `sticky top-0 z-30 lg:hidden bg-card/95 backdrop-blur-xl border-b border-border`, with no `pt-safe` and no inset in the inner `px-4 py-3 min-h-[56px]` row |

## Corrections to `shape.md`

1. **`.pt-safe` has zero consumers.** `grep -rn "pt-safe" frontend/src` returns only its own
   definition at `index.css:246`. `shape.md` reads as though both utilities are wired up and
   merely inert on iOS; only `.pb-safe` is wired, in exactly one place
   (`BottomNavigation.tsx:44`). The work is therefore *"add the top consumer that was never
   written"*, not *"make an existing one report real numbers"*. This matters for estimating:
   there is no single line to flip.

2. **There are seven inert `env()` sites, not the three listed.** The complete set:

   | File:line | Expression |
   |---|---|
   | `frontend/src/index.css:245` | `.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px) }` |
   | `frontend/src/index.css:246` | `.pt-safe { padding-top: env(safe-area-inset-top, 0px) }` |
   | `frontend/src/components/layout/Base44Layout.tsx:333` | `bottom-[calc(env(safe-area-inset-bottom,0px)+9.75rem)]` (AI FAB) |
   | `frontend/src/components/pwa/InstallPrompt.tsx:25` | `bottom-[calc(env(safe-area-inset-bottom,0px)+11rem)]` |
   | `frontend/src/components/pwa/UpdateBanner.tsx:18` | `bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)]` |
   | `frontend/src/components/chat/ChatAgentPanel.tsx:409` | `pb-[max(0.75rem,env(safe-area-inset-bottom))]` |
   | `frontend/src/components/voice/VoiceAgentPanel.tsx:149` | `pb-[max(1.25rem,env(safe-area-inset-bottom))]` |
   | `frontend/src/components/body/ExercisePickerSheet.tsx:308` | `pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]` |

   All eight expressions change value the moment the meta tag lands. Every one of them is a
   thing that **moves** in the fix, so every one is a thing to re-check.

3. **This is not native-only.** `frontend/index.html:13` sets
   `apple-mobile-web-app-status-bar-style="black-translucent"`, which puts an *installed iOS
   home-screen PWA* under the status bar too — same bug, same root cause, second shipping
   surface. `shape.md` frames the issue as a Capacitor-shell problem; it is a
   `display: standalone` problem that the Capacitor shell also has. Practically this widens
   the blast radius of the fix and adds a manual check.

4. **`shape.md`'s fix section names only the top inset. `viewport-fit=cover` turns on all
   four.** Nothing in `frontend/src` pads `safe-area-inset-left` or `-right`. In landscape on
   a notched device the notch claims ~59px of one edge; `<main>`'s `px-4` (16px,
   `Base44Layout.tsx:301`) puts body copy and tap targets under it. This is a **new**
   regression introduced by the meta tag, and it has to be in the same commit.

5. **`contentInset` has an order-of-operations trap the fix section understates.**
   `automatic` and `viewport-fit=cover` each add the top inset independently — the UIScrollView
   content inset *and* the CSS `env()` padding. Keeping both yields roughly double padding
   (~118px of dead space on an iPhone 17 Pro) and a header that floats away from the status
   bar. The combination that composes is `contentInset: 'never'` **plus** `viewport-fit=cover`
   **plus** CSS insets: one source of truth for the offset, expressed in CSS where every other
   surface can see it.

6. Minor, so nobody greps for the wrong string: the kickers in source read `kicker="Body"`
   and `kicker="Energy"`. The all-caps in the report is the `uppercase` class on
   `PageHeader`'s kicker (`ui/page.tsx:41`).

7. Context for whoever implements: there is **no `frontend/ios/` directory** checked in
   (only `frontend/android/`), so `capacitor.config.ts` is the single in-repo expression of
   iOS behaviour and the change reaches a device via `npx cap add ios` / `cap sync`. Also
   `frontend/package.json` pins `@capacitor/cli ^7.5.0` against `@capacitor/core|ios|android
   ^8.1.0` — the skew tracked on `claude/ios-sweep-capacitor-version-skew`. Confirm
   `contentInset` semantics against the runtime that actually ships before calling this done.

---

## The atomic set — everything below lands in one commit

Splitting this ships a regression. `viewport-fit=cover` alone extends the WebView under the
status bar while nothing pads for it, so the collision gets **worse**, not better; the
padding alone is a no-op because `env()` still resolves to `0`. Ten files, one commit:

1. `frontend/index.html` — the viewport meta
2. `frontend/capacitor.config.ts` — `contentInset`
3. `frontend/src/index.css` — the `--safe-*` variables and the utilities
4. `frontend/src/components/layout/Base44Layout.tsx` — mobile header, desktop header, sidebar drawer, FAB
5. `frontend/src/components/layout/BottomNavigation.tsx` — verify the pill under a live bottom inset
6. `frontend/src/components/marketing/Navbar.tsx` — `fixed top-0`
7. `frontend/src/components/pwa/OfflineIndicator.tsx` — `fixed top-0`
8. `frontend/src/components/energy/BarcodeScanner.tsx` — `fixed inset-0` full-screen header row
9. `frontend/src/components/onboarding/SetupWizard.tsx` — `fixed inset-0` full-screen
10. `agent-os/standards/frontend/mobile-ui.md` — the standard quotes the implementation verbatim

Plus tests (Task 7), which may be separate commits on the same PR.

---

## Task 1 — Spec documentation

- [x] `shape.md` — the mismatch, the mechanism, acceptance criteria (already on this branch)
- [x] `standards.md` — which standards apply and the exact rules they impose
- [x] `plan.md` — this file
- [ ] No `references.md`: the verification table above carries the file:line evidence

## Task 2 — Give the insets a name in `index.css`

- [ ] `frontend/src/index.css` — in the `:root` block inside `@layer base` (alongside the
      colour tokens at lines 11–56), define the four insets once:
      `--safe-top: env(safe-area-inset-top, 0px)` and the same for `-right`, `-bottom`,
      `-left`. `env()` inside a custom property resolves at use, so this is a pure
      indirection with no behaviour change on its own.
- [ ] `frontend/src/index.css:245-246` — re-point the existing utilities at the variables:
      `.pb-safe { padding-bottom: var(--safe-bottom) }`, `.pt-safe { padding-top: var(--safe-top) }`.
      Keep both names — `pb-safe` is asserted by a test and used in production.
- [ ] Add `.px-safe { padding-left: var(--safe-left); padding-right: var(--safe-right) }` in
      the same `@layer utilities` block, for the landscape notch (correction 4).
- [ ] Replace the six inline `env(safe-area-inset-bottom…)` bracket expressions listed in
      correction 2 with the `var(--safe-bottom)` equivalent, e.g. the AI FAB at
      `Base44Layout.tsx:333` becomes `bottom-[calc(var(--safe-bottom)+9.75rem)]`. Same
      computed result, one definition, and — the point — overridable from a test.

**Why the indirection at all.** `env()` cannot be set by a test: no headless browser reports
a notch, and jsdom does not implement it. That is precisely why this bug shipped. A CSS
variable is a seam a Playwright test can drive (`--safe-top: 59px`) to assert the layout
actually responds. The cheaper alternative — leave `env()` inline and rely on a simulator
pass — is what the codebase does today, and it is why `BottomNavigation.test.tsx` is green
while the behaviour is dead. Rejected on those grounds.

## Task 3 — Turn the insets on

- [ ] `frontend/index.html:7` — append `, viewport-fit=cover`. Keep
      `maximum-scale=1.0, user-scalable=no` byte-for-byte: dropping them is a separate
      accessibility call, and changing pinch-zoom in this commit would confound the visual diff.
- [ ] `frontend/capacitor.config.ts:8` — `contentInset: 'automatic'` → `'never'`, with a
      comment naming the reason (correction 5: `automatic` + `viewport-fit=cover` double-pads;
      CSS owns the offset now).

## Task 4 — Pad every top-anchored surface

- [ ] `Base44Layout.tsx:218` — the sticky mobile header gets `pt-safe`. It is the load-bearing
      change: because `bg-card/95 backdrop-blur-xl` is on the element and the padding is
      inside it, the header's own background now paints the status-bar strip, and scrolled
      content passes *behind* it instead of *above* it. `min-h-[56px]` stays on the inner row
      so the touch targets keep their height.
- [ ] `Base44Layout.tsx:260` — the desktop header (`hidden lg:sticky lg:block top-0`) gets
      `pt-safe` too. It is the header that renders on an iPad in standalone PWA mode (top
      inset ~24px). Zero visual change on desktop browsers, where the variable is `0`.
- [ ] `Base44Layout.tsx:162` — the sidebar drawer is `fixed top-0 left-0 h-full w-72`; its
      logo block has `pt-7` (28px), less than a 59px inset. Add `pt-safe` to the drawer, and
      `pb-safe` so the "Your journey" card clears the home indicator.
- [ ] `frontend/src/components/marketing/Navbar.tsx:29` — `fixed top-0 left-0 right-0`, the
      PublicLayout nav behind `/welcome`, `/pricing`, `/about`, `/privacy`, `/terms`,
      `/contact`. Add `pt-safe`.
- [ ] `frontend/src/components/pwa/OfflineIndicator.tsx:21` — `fixed top-0 left-0 right-0`
      banner. Add `pt-safe`, or it renders its text under the clock exactly like the heading does.
- [ ] `frontend/src/components/energy/BarcodeScanner.tsx:63` — `fixed inset-0 flex flex-col
      bg-black`; its header row (line 65, holding the "Close scanner" button) sits at the very
      top. Add `pt-safe` to the header row. A full-bleed black camera view under the status bar
      is correct and desirable — the *control* is what must move down.
- [ ] `frontend/src/components/onboarding/SetupWizard.tsx:72` — `fixed inset-0 … items-center
      … p-4`. Centred content is mostly safe, but a tall step overflows into the strip. Add
      `pt-safe pb-safe`.

## Task 5 — The landscape insets nobody has ever padded

- [ ] `Base44Layout.tsx:301` — `<main className="px-4 sm:px-6 lg:px-8 …">` gets `px-safe`, or
      the horizontal padding becomes `calc(1rem + var(--safe-left))` / `-right`. Without this,
      landscape on a notched phone puts body text under the notch — a regression this commit
      would introduce, not one it inherits.
- [ ] `BottomNavigation.tsx:44` — the nav is `left-0 right-0`; the pill's `mx-3.5` (14px) is
      narrower than a landscape inset. Add `px-safe` to the fixed wrapper.
- [ ] `Base44Layout.tsx:333` (AI FAB) and `Base44Layout.tsx:322` (desktop voice FAB) — both
      `right-4`. Fold `var(--safe-right)` into the offset.

## Task 6 — Re-check the bottom stack, which all moves at once

Nothing here is a code change by default; it is the arithmetic that must be confirmed on
device, because these numbers have only ever been evaluated with the insets at zero.

- [ ] Bottom nav on a notched device: 64px pill (`h-16`) + 14px (`mb-3.5`) + 34px inset =
      **112px**, against `<main>`'s `pb-32` = **128px**. It clears, by 16px. Confirm visually;
      if it reads tight, `pb-32` becomes `pb-[calc(8rem+var(--safe-bottom))]` rather than a
      bigger magic number.
- [ ] AI FAB rises 34px, to 190px off the bottom. This changes the overlap geometry that
      `agent-os/specs/2026-09-14-1035-ai-fab-overlap/shape.md` is measuring — **land this task
      first and re-measure that one afterwards.** That spec already says as much.
- [ ] `InstallPrompt.tsx:25`, `UpdateBanner.tsx:18` — both rise 34px. Confirm neither now
      collides with the AI FAB or the bottom nav.
- [ ] `VoiceAgentPanel.tsx:149`, `ChatAgentPanel.tsx:409` — the `max(…)` forms go from 20px/12px
      to 34px. Intended, but the composer row is where a mis-sized inset is most obvious.
- [ ] `ExercisePickerSheet.tsx:308` — `calc(0.75rem + inset)` goes 12px → 46px. This is the one
      that *adds* rather than `max()`es, so it grows the most. Check the last row is still reachable.

## Task 7 — Tests that would actually have caught this

The existing test is the lesson. `BottomNavigation.test.tsx:41` asserts
`nav.className).toContain('pb-safe')` — a **string** assertion in jsdom, which has no Tailwind
build, no `env()` support and no layout engine. It can only ever prove that a class name was
typed. It has been green throughout the entire life of this bug.

- [ ] **`frontend/index.test.ts`** (new, co-located with `frontend/index.html` per
      `global/testing`; inside the default vitest include, since `vite.config.ts:102` excludes
      only `e2e/**` and `node_modules/**`). Read the file and assert the viewport meta contains
      `viewport-fit=cover` — and, in the same test, that `user-scalable=no` and
      `maximum-scale=1.0` survived. Five lines, runs in the unit lane, and **this alone would
      have caught the original bug.** Cheap tests that encode a platform requirement are worth
      more than expensive ones that encode a class name.

- [ ] **`frontend/e2e/safe-area.spec.ts`** (new). The behavioural test, in the `webkit`
      project, at a notched viewport (390×844). Simulate a notch by overriding the Task 2
      variables — `page.addStyleTag({ content: ':root{--safe-top:59px;--safe-bottom:34px}' })`
      — then assert, on a signed-in app screen:

      1. **The strip is never painted by page content.** After
         `window.scrollTo(0, document.body.scrollHeight)`, sample
         `document.elementFromPoint(x, 10)` at several x positions and require every hit to be
         the sticky header, `<html>` or `<body>` — never an element inside `<main>`. This is
         acceptance criterion 1 turned into an assertion, and it is the one that fails today.
      2. **The header reserves the inset.** `getComputedStyle(header).paddingTop === '59px'`,
         and the inner row's `getBoundingClientRect().top >= 59`.
      3. **The bottom bar clears the home indicator.** The pill's
         `getBoundingClientRect().bottom <= window.innerHeight - 34`. This is what
         `BottomNavigation.test.tsx:41` has always been *standing in for*, expressed as geometry.
      4. **Zero insets are a no-op.** Re-run 2 and 3 with the variables at `0px` and require
         the header padding to be `0px` and the layout to match the current web app. This is
         the guard for critical rule 1 — it fails if the fix leaks a 59px band onto desktop.

- [ ] **`BottomNavigation.test.tsx:38-47`** — keep the assertion, do not promote it. jsdom
      cannot prove a safe area is honoured, and deleting a passing structural guard would
      violate rule 2. Rename the case to say what it actually checks (the utility class is used
      instead of an inline style, which is the `mobile-ui` rule) and add a one-line comment
      pointing at `e2e/safe-area.spec.ts` as the test that covers the behaviour. Honest naming
      is the fix; the test itself is fine at what it does.

## Task 8 — Manual verification matrix

Acceptance criterion 4 in `shape.md` says "a notched device and a non-notched one". The full
grid, because this change reaches every surface at once:

- [ ] **iPhone 17 Pro, portrait** (402×874, insets 59/34) — the reported repro. Scroll Home,
      Workouts, Food, Water, Goals, Insights, Profile to the bottom: no content in the strip at
      any offset.
- [ ] **iPhone 17 Pro, landscape** — the left/right insets. Body copy and tap targets clear the
      notch on both rotations.
- [ ] **iPhone SE (3rd gen)** (375×667, top inset 20, **bottom inset 0**) — the non-notched
      case, and the one most likely to look wrong. The header must **not** gain a 59px band, and
      the bottom pill must not float above a phantom home indicator.
- [ ] **iPad, standalone PWA** — exercises the desktop header path with a ~24px top inset.
- [ ] **Desktop Chrome and Safari, 1440px** — insets are `0`. The layout must be **identical**
      to `main`. Screenshot-diff it if there is any doubt.
- [ ] **Installed iOS home-screen PWA** (Safari → Add to Home Screen) — the second surface, per
      correction 3.
- [ ] **Android via `frontend/android`** — Capacitor 8 on Android 15+ is edge-to-edge by
      default. Confirm the same CSS path applies and the status bar is not double-padded.
- [ ] With the Voice Agent sheet open, its scrim now covers the whole screen including the
      strip — the tell described in `shape.md` disappears.

## Task 9 — Verification commands

- [ ] `cd frontend && npx tsc --noEmit` — clean
- [ ] `cd frontend && npm run test -- --run` — the existing suite plus the new
      `index.test.ts`. Run it **from `frontend/`**: the root `test` script drops `--run` and
      hangs in watch mode (`global/testing`).
- [ ] `cd frontend && npm run test:e2e` — including the new `safe-area.spec.ts`
- [ ] `cd frontend && npm run build` — clean
- [ ] `npx cap sync ios` after `npx cap add ios`, then a simulator pass on Task 8

## Regression risk

**This is a one-line change to a file that governs every screen the product ships.** The
viewport meta applies to the web app, the PWA, the TWA (`twa/` wraps the deployed web app)
and both Capacitor shells. There is no way to scope it to iOS.

- **The safe bar is a no-op on the web.** `env(safe-area-inset-*)` is `0` in every desktop
  browser and in mobile Chrome without a display cutout, so a correct implementation changes
  nothing outside a notched standalone shell. Task 7's zero-inset test case is what enforces it.
- **`100vh` semantics change.** Under `viewport-fit=cover`, `100vh` includes the status-bar
  strip. Eight surfaces centre on `min-h-screen`: `Login.tsx:38`, `Signup.tsx:57`,
  `ForgotPassword.tsx:34` and `:53`, `AuthCallback.tsx:54`, `NotFound.tsx:8`,
  `ErrorBoundary.tsx:93`, `routes.tsx:62`, plus `Base44Layout.tsx:147` and `:216` and
  `PublicLayout.tsx:7`. Centring stays correct; a **tall** form (Signup) can now push its top
  edge under the clock. Check Signup on a small notched device specifically.
- **Non-notched iPhones are the likeliest place to break something.** An SE reports a 20px top
  inset and a **0px** bottom one. A fix that hard-codes 59/34 anywhere instead of reading the
  variable will look wrong there. Nothing in the plan hard-codes an inset outside the tests.
- **Eight expressions change value simultaneously** (correction 2). The bottom of the screen is
  crowded — nav pill, AI FAB, install prompt, update banner, two sheet composers — and they all
  move up together by 34px. Task 6 exists because that is where a subtle regression would hide.
- **Cross-PR coupling.** `2026-09-14-1035-ai-fab-overlap` measures FAB overlap at the current
  offsets, which this task changes. Order matters: this one first.
- **A follow-on the fix will expose.** `index.html:13` sets
  `apple-mobile-web-app-status-bar-style="black-translucent"`, i.e. **white** status-bar glyphs,
  over a light `--paper` header. Once content stops covering the clock, an invisible clock is
  the next bug. Not fixed here (see below) but it should be filed before this ships to users.

## Deliberately not done

- **No `@capacitor/status-bar`.** Controlling glyph colour from JS adds a dependency, which is a
  `global/tech-stack` decision, and it would put a second source of truth next to the meta tag.
  File the `black-translucent` contrast issue as its own task.
- **`maximum-scale=1.0, user-scalable=no` stays.** Removing it is a real accessibility
  improvement and a real behaviour change; doing it inside a layout fix makes the visual diff
  unreadable. Separate task.
- **No `SafeAreaView` component.** The insets are CSS. A wrapper would add a DOM level to every
  screen for something a utility class already expresses (`frontend/components`).
- **`BottomNavigation.test.tsx:41` is not deleted.** It is a valid structural guard against
  inline styles; it is only mislabelled. Renamed, not removed (critical rule 2).
- **`mobile/` (Expo) is not touched.** Dormant, ships to nobody, per root `CLAUDE.md`.
- **The Capacitor CLI/runtime version skew is not fixed here.** Tracked on
  `claude/ios-sweep-capacitor-version-skew`; it only needs to be *confirmed* before the
  `contentInset` change is signed off.
