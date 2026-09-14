# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `frontend/mobile-ui` | The whole task is a fixed-position element, a safe area and a touch target |
| `frontend/design-tokens` | The two floating controls carry different elevation and radius treatments |
| `frontend/components` | The AI button and the mic must stop being two unrelated snippets in two files |
| `global/critical-rules` | Moving a persistent control is a large UI change — analyse, name the problem, then change |
| `global/testing` | `Base44Layout.test.tsx` mocks `hasAiAccess: false`, so the FAB is currently untested |

Not applicable: `frontend/data-fetching` and `frontend/api-client` — no server state moves.
No backend standard applies; nothing under `backend/` is touched.

## Key points carried into the work

- **Anything pinned above the bottom nav offsets from it.** `frontend/mobile-ui` gives the
  exact pattern — `bottom-[calc(env(safe-area-inset-bottom,0px)+9.75rem)]`. The current FAB
  uses the shape of that rule but not its intent: it offsets from the *viewport*, with a
  literal that no longer corresponds to anything the bar measures. The offset has to be
  derived from the bar's own geometry, in the same file as the bar.

- **Fixed-position elements must respect the notch and home indicator, via the utilities.**
  `.pb-safe` / `.pt-safe` exist for this. `BottomNavigation` uses `.pb-safe`; the AI FAB
  inlines its own `env()` call and `main`'s `pb-32` accounts for no inset at all. One
  element per system should own the inset.

- **Touch targets ≥ 44px, including icon-only buttons.** The FAB is `h-12 w-12` (48px) and
  the mic is 60px. Whatever the AI control becomes, it does not go below 44px — and it must
  not *steal* 44px from something else, which is the actual bug: it currently sits on top of
  44px targets belonging to other controls.

- **One voice entry point per viewport.** `frontend/mobile-ui` records why Home's mic hero
  card was removed: two controls doing the same job on one screen needed a subtitle to
  explain themselves. The same reasoning governs two unrelated floating circles — the mic
  and the AI button are one system or they are a repeat of that mistake.

- **Never let content touch the screen edge; spacing scale is `4 · 8 · 12 · 16 · 24 · 32`.**
  The FAB sits at `right-4` (16px) while the bar sits at `mx-3.5` (14px). Two chrome
  elements on the same edge, 2px apart, neither on a shared constant.

- **Elevation comes from the scale.** The bar and the AI FAB both use `shadow-card-lg`; the
  mic uses `shadow-fab` (a primary-tinted glow defined in `index.css`). Two floating
  controls in one system should not be lit differently by accident — pick one deliberately.

- **Radius below ~44px is `rounded-md` or `rounded-full`, and mean it.** Both controls are
  `rounded-full` today. If the AI control shrinks, it stays `rounded-full`; it never
  acquires a bracket radius.

- **Prefer an existing `components/ui/` primitive.** The FAB is already a `Button size="icon"`.
  Keep it one.

- **Pages compose, they don't style.** No page gains a spacer, a `pb-*` override or a
  `pointer-events` workaround to dodge the FAB. The shell owns the reserved strip.
  `Water.tsx`'s page-local `pb-28` is the existing counter-example and is reconciled here.

- **Never break existing functionality.** The FAB opens `AiChatPanel`; the mic toggles
  `VoiceAgentPanel`. Both keep their `aria-label`s, both keep working, and the desktop pair
  (`lg:bottom-6` mic above `lg:bottom-[5.25rem]` AI) is already correct and stays.

- **Unit tests co-locate.** The layout tests are `Base44Layout.test.tsx` and
  `BottomNavigation.test.tsx`, beside the components they cover.
