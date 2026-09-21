# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `frontend/design-tokens` | Owns the radius and elevation scales. Its "every radius derives from `--radius`, so the scale moves as one" is the rule the shared `radii` breaks by stopping at `xl`, and its shadow scale is the one mobile should follow |
| `frontend/components` | The core of Finding 4. "Reach for `components/ui/` first — a new styled `<div>` that duplicates `card.tsx` is a bug" is exactly what mobile's four hand-rolled cards are, and the standard is worded so it reads as web-only |
| `frontend/mobile-ui` | Names the card treatment (`rounded-2xl`, `shadow-card`), the spacing scale (`4 · 8 · 12 · 16 · 24 · 32`) and the 44px touch-target floor — all three of which this spec measures both clients against |
| `global/critical-rules` | Every card in the Expo app changes radius and gains a shadow. Analyse first, name the problem, then change |
| `global/testing` | Task 6 adds an AST guard in the shape of the two that exist. Depends on #308's CI fix, since `mobile`'s job runs no tests today |
| `global/tech-stack` | No new dependency. The primitives wrap Paper components already in the tree; `shadowStyle` is a helper in the tokens package, not a library |

## Key points carried into the work

- **Pick a radius by element size, not just by role.** `design-tokens.md` is explicit: at
  18px, `rounded-xl` is half the height of a 36px control, so a small icon button rendered
  with it is a circle. This matters doubly on mobile, where Paper multiplies `roundness` by
  up to 7 and the result silently clamps to half the control's height.
- **Never write a bracket value.** `rounded-[22px]` is `rounded-2xl`, and a radius that
  isn't on the scale is a new scale step, not a one-off. The mobile translation is: a bare
  `borderRadius: 22` is a missing token, which is why Task 1 adds `xxl` before Task 3 uses
  it.
- **Cards use `rounded-2xl` or larger** — the reason `xxl` is not optional.
- **Touch targets ≥ 44px, icon-only buttons included.** Paper's default is 34px at the size
  the app uses.
- **New tokens go in the shared package first, then get used.** `radii.xxl` and the
  elevation additions land in `packages/shared` before any mobile file references them, the
  same way a new colour goes into `index.css` before a component uses it.
- **Don't remove working features.** The four card components change what they render, not
  what they do; Task 4 migrates them one at a time so a regression is bisectable.
- **The web is the reference even where the web is inconsistent.** Its shadow usage splits
  40/29 between Tailwind's stock scale and the app's own. Mobile follows the *documented*
  scale and the split is raised as an open question rather than resolved unilaterally.
</content>
