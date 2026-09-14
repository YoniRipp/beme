# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `frontend/mobile-ui` | The navigation section names `BottomNavigation` as the pattern and fixes the 44px touch-target floor that six tabs at 390px leave no room above |
| `frontend/components` | `BottomNavigation` is a canonical piece to extend, not re-invent; the Expo bar is its counterpart |
| `global/critical-rules` | Changing the tab set is a large UI change: analyse, name the problem, then change |
| `global/testing` | `mobile/` has no navigation test; the web's `Base44Layout.test.tsx` is the shape to copy |
| `global/domain-conventions` | "Food" vs "Energy" vs "Journal" is domain vocabulary, and the app should speak one |
| `global/tech-stack` | Open question 1's drawer alternative would add `@react-navigation/drawer` |

No backend standards apply. This spec changes no endpoint, no payload and no query.

## Key points carried into the work

- **The web client is the reference.** Where the two disagree, mobile is the one that is wrong.
  That rule is already written into
  `agent-os/specs/2026-09-12-1700-mobile-theme-shell/theme-shell-plan.md` for the theme phase;
  it holds for navigation too.
- **The four-tab decision is settled, not up for re-derivation.**
  `agent-os/specs/2026-08-15-1200-single-role-nav-and-custom-exercises/shape.md` gives the
  reasoning. Expo conforms.
- **Never remove a working feature** (critical rule 2). Goals and Insights leave the bar, not
  the app — exactly as Goals did on the web.
- **Touch targets ≥ 44px**, and a six-tab bar at 390px is the case that gets close.
- **Rename the route key, not just the label.** The current mismatch exists because a
  `tabBarLabel` was overridden while the key underneath stayed. TypeScript catches the key
  rename everywhere; it cannot catch a label that lies.
- **One definition, not two copies.** The mobile-foundation spec moved types and schemas into
  `packages/shared` for exactly the drift this spec is cleaning up. Open question 2 asks
  whether the tab labels join them.
- **Don't change API shapes** (critical rule 4). Nothing here goes near the wire.
