# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `frontend/components` | The reset is shell behaviour, so it goes in a hook the shells call — not a fourth `useEffect` copy-pasted into two layouts |
| `frontend/mobile-ui` | The whole bug is a mobile-navigation bug: four thumb-reachable tabs, one column, one document scroller. The fix must leave the sticky header, `pb-safe` bottom bar and 44px targets exactly as they are |
| `global/critical-rules` | "Analyse the current layout, identify the actual UX problem, propose, then implement" — and rule 1, never break what works. Two things work today and must keep working: the desktop header's scrolled state and browser back/forward |
| `global/testing` | Co-located `*.test.tsx`, Vitest + RTL, Playwright in `e2e/`, `tsc --noEmit` is lint |
| `frontend/data-fetching` | Not changed by this work, but it is *why* restore is hard: a page's final height only exists after its React Query hooks resolve, so there is nothing to restore an offset against at navigation time |

Not applicable: `frontend/design-tokens` (no colour, shadow or radius changes),
`frontend/api-client` (no network), everything under `backend/`.

## Key points carried into the work

**From `frontend/components`**

- *Small, focused, reusable. No monolithic page components.* `Base44Layout` is already 342
  lines with five `useEffect`s. The reset arrives as `useScrollToTopOnNavigate()` in
  `src/hooks/` — one line at each call site — rather than a sixth inline effect that
  `PublicLayout` would then have to duplicate.
- *`src/hooks/` is where device/browser hooks live* (`useMediaQuery`, `useIsMobile`,
  `useOnlineStatus`). A scroll hook is the same species. It is not feature logic, so it does
  not belong in `features/`.
- *Import via the `@/` alias, never long relative chains.* `import { useScrollToTopOnNavigate }
  from '@/hooks/useScrollToTopOnNavigate'`.
- *No unnecessary re-renders.* The hook must hold no state. It reads `useLocation()` and
  `useNavigationType()` and writes to the scroller in an effect — a `useState` here would
  re-render the entire shell on every navigation for nothing.

**From `frontend/mobile-ui`**

- *Vertical scrolling, one column.* The app has exactly one scroller — the document — at
  every breakpoint. The fix targets `window`, and nothing in it may introduce an
  `overflow-y-auto` wrapper, because a new scroll container would silently break the sticky
  headers (`Base44Layout.tsx:218`, `:259`) and the `window.scrollY` listener at line 105.
- *`BottomNavigation` is fixed to the bottom.* It is `position: fixed` with `pb-safe`; it does
  not move when the document scrolls and is unaffected by the reset. No change to that file
  is required for the core fix.
- *Touch targets ≥ 44px.* The optional "tap the active tab to scroll to top" item must keep
  the `min-h-[48px]` tab hit area and must not turn a `<Link>` into a `<button>` — the tabs
  have to stay real links for middle-click, long-press and screen readers.

**From `global/critical-rules`**

- *Never break existing functionality.* Two behaviours are load-bearing and easy to break:
  1. `Base44Layout.tsx:104-108` sets `scrolled` from `window.scrollY > 10`, which drives the
     desktop header's glass border. Scrolling to 0 fires `scroll` and correctly clears it —
     but only if the reset goes through the scrolling API rather than something that bypasses
     the event.
  2. Browser back and forward. This code ships as the web app and the PWA, where the back
     gesture is a first-class control. Resetting on every location change would break it.
- *Deliberate and structured, not random restyling.* The decision between reset and per-tab
  restore is recorded in `plan.md` Task 2 with its reasoning, not left to the implementer.

**From `global/testing`**

- New hook `src/hooks/useScrollToTopOnNavigate.ts` gets `src/hooks/useScrollToTopOnNavigate.test.tsx`
  beside it. Not in a `__tests__/` folder.
- Run the frontend suite **from `frontend/`**: `npm run test -- --run`. The root `test` script
  drops the `--`, leaving vitest in watch mode.
- `npm run lint` is `tsc --noEmit`, run inside `frontend/`. A type error is a lint failure.
- Playwright lives in `e2e/*.spec.ts`. Note that both authenticated describes in
  `e2e/dashboard.spec.ts` are `test.describe.skip` — the app's auth gate cannot be crossed by
  route interception — so an E2E scroll assertion written today does not execute. It is still
  worth writing into the skipped block, but it is not the gate.
