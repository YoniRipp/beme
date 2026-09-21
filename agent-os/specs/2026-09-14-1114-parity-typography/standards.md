# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `frontend/design-tokens` | Owns the type pair (Fraunces display + Inter body). It stops at naming the two families and says nothing about weights, which is the gap all 27 unbacked declarations fell through |
| `frontend/mobile-ui` | The tab-label treatment this matches (`text-caption font-bold uppercase tracking-[0.06em]`) belongs to `BottomNavigation`, which this standard specifies |
| `frontend/components` | Task 4 re-points the typescale at what `ui/page.tsx` and `Base44Layout.tsx` actually render rather than at the base CSS rule — "pages compose, they don't style" is why the component override is the truth and the stylesheet is not |
| `global/testing` | Task 5 extends an existing AST guard to close a structural blind spot. Depends on #308's CI fix, since `mobile`'s job runs no tests today |
| `global/tech-stack` | Three added font faces, no new packages — the weights ship inside `@expo-google-fonts/inter` and `/fraunces`, already dependencies. Bundle size grows; that is named, not hidden |
| `global/critical-rules` | Every heading, tab label and screen title in the Expo app changes face. Analyse first, name the problem, then change |

## Key points carried into the work

- **On Expo, a weight is a family name, not a number.** `@expo-google-fonts` ships one
  static file per weight, each registered under its own family, so `fontWeight: '700'` on a
  single-face family cannot produce bold. `mobile/src/theme.ts` already documents this; the
  work is making the codebase obey it.
- **Never inline a hex colour** — and by the same reasoning, never name a weight the app
  hasn't loaded. Both are "referencing something that isn't there"; only the first has a
  guard today.
- **Match the rendered surface, not the stylesheet.** `index.css` sets `h1`/`h2` to Fraunces
  500, but `PageHeader` overrides to Inter 800 and the app bar to Fraunces 600. The base rule
  is real and mostly unused; the components are what a user sees.
- **The web is the reference even where the web is wrong.** Its `font-extrabold` is unbacked
  by its own Google Fonts request. Mobile caps at 700 rather than shipping a real 800 that
  would out-weight the reference, and the web-side fix is raised, not made here.
- **A guard that can be sidestepped by not importing `Text` is not a guard for navigation
  text.** Task 5 extends the existing one on the structural fact (a style object bound to a
  text prop) rather than adding a file allowlist.
- **Don't break Expo Go.** Added font faces are asset-only and need no custom dev client, so
  `mobile/CLAUDE.md`'s constraint holds — but it is checked, not assumed.
</content>
