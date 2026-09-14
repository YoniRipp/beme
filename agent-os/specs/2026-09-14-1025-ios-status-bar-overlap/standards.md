# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `frontend/mobile-ui` | This *is* the safe-area section of that standard. The fix adds the top-inset consumer the standard already assumes exists, and the standard's own code block has to move with the implementation. |
| `frontend/design-tokens` | The inset values become `index.css` variables before they are used, the same rule new colours follow. No bracket one-offs, no inline `style={{}}`. |
| `frontend/components` | The shell stays `layout/Base44Layout.tsx` + `layout/BottomNavigation.tsx`. No new `<SafeArea>` wrapper primitive. |
| `global/critical-rules` | A meta-tag change reaches every surface at once — web, PWA, TWA, Capacitor iOS *and* Android. On any browser where `env()` is 0 the diff must be a visual no-op. |
| `global/testing` | Unit tests co-locate; Playwright lives in `frontend/e2e/*.spec.ts`; the frontend suite runs from `frontend/`. |
| `global/tech-stack` | Only if `@capacitor/status-bar` is adopted — a new dependency, so a separate decision. It is **not** in this commit. |

## Key points carried into the work

**`frontend/mobile-ui` — "Safe areas"**

> Fixed-position elements must respect the notch and home indicator. **Use the utilities, not
> inline styles.**
> ```
> .pb-safe  →  padding-bottom: env(safe-area-inset-bottom, 0px)
> .pt-safe  →  padding-top: env(safe-area-inset-top, 0px)
> ```
> Anything pinned above the bottom nav offsets from it:
> `bottom-[calc(env(safe-area-inset-bottom,0px)+9.75rem)]`

Three constraints fall out of this:

1. **Every new padding goes through a utility class**, never a `style` attribute.
   `BottomNavigation.test.tsx:42` already asserts `expect(nav).not.toHaveAttribute('style')`
   for exactly this reason.
2. The standard documents `.pt-safe` as if something uses it. **Nothing does** — the fix is
   to add the missing consumer, not to invent a new mechanism.
3. The standard hard-codes the literal string `env(safe-area-inset-bottom,0px)` in a
   documented pattern used at five call sites. If the implementation moves behind
   `var(--safe-bottom)` for testability, `agent-os/standards/frontend/mobile-ui.md` is part
   of the same commit. A standard that no longer matches the code is worse than no standard.

Also from `mobile-ui`: **"Never let content touch the screen edge"** and **"touch targets
≥ 44px"**. `viewport-fit=cover` turns on the *left and right* insets too — in landscape on a
notched device the notch eats ~59px of one edge, and `px-4` (16px) puts content and tap
targets underneath it. Padding the horizontal insets is a requirement of this standard, not
a nicety.

**`frontend/design-tokens`**

> Use Tailwind classes bound to CSS variables in `index.css`. Never hardcode…
> **New colors go in `index.css` as tokens first, then get used — a one-off color in a
> component is a bug.** … **Never write a bracket value.**

A safe-area inset is the same class of value as a colour: an environment-wide constant
spent across many components. It belongs in `:root` in `index.css` as
`--safe-top / --safe-right / --safe-bottom / --safe-left`, defined once from `env()`, and
consumed by utilities. Seven scattered copies of `env(safe-area-inset-bottom,0px)` is the
bracket-value smell the standard is written against.

**`global/critical-rules`**

> 1. **Never break existing functionality.** … 5. Default focus is UI, UX, and bug fixing.
> **When making a large UI change:** analyse the current layout → identify the actual UX
> problem → propose the improvement → then implement.

`plan.md` is that procedure discharged in writing. The operative reading of rule 1 here: the
web app and the desktop layout must be **pixel-identical before and after**, because
`env(safe-area-inset-*)` is `0` everywhere except a notched native/standalone shell. Any
visual change on desktop Chrome is a bug in the change, not a side effect of it.

The product bar — *"MyFitnessPal, Strong, Apple Fitness, Nike Training Club"* — is the
reason this is high severity rather than cosmetic. None of those apps let a heading smear
across the system clock.

**`global/testing`**

> Unit tests co-locate with the file under test: `auth.ts` → `auth.test.ts`. Not in a
> `__tests__/` folder. … Playwright for E2E in `frontend/e2e/*.spec.ts`. … Run the frontend
> suite from `frontend/`. … `npm run lint` is `tsc --noEmit`.

So: the guard on the viewport meta is `frontend/index.test.ts` (co-located with
`frontend/index.html`, and inside the default vitest include, since `vite.config.ts:102`
only excludes `e2e/**` and `node_modules/**`). The behavioural test is
`frontend/e2e/safe-area.spec.ts`. It does **not** go in `src/`, and the class-name assertion
in `BottomNavigation.test.tsx` does not get promoted to something jsdom cannot deliver.

**`frontend/components`**

> Reach for `components/ui/` first. A new styled `<div>` that duplicates `card.tsx` or
> `button.tsx` is a bug. … Keep DOM nesting shallow.

Resist adding a `SafeAreaView`-style wrapper component. The insets are CSS; a component
would add a DOM level to every screen for something a utility class already expresses.

**`global/tech-stack`**

`@capacitor/status-bar` is not currently a dependency (`frontend/package.json` has
`@capacitor/core`, `/ios`, `/android`, `/cli` and `@capacitor-community/speech-recognition`
only). Controlling status-bar glyph colour from JS would add one. Out of scope here; noted
in `plan.md` under "Deliberately not done".
