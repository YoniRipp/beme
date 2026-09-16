# Design Tokens

The palette is paper-warm neutrals with a single sage accent. Terracotta is **reserved for food/energy** — don't spend it as a generic accent.

Use Tailwind classes bound to CSS variables in `index.css`. Never hardcode a hex or arbitrary HSL.

| Role | Token |
|---|---|
| App background | `--paper` / `--paper-2` (muted sections) |
| Primary text | `--ink` |
| Secondary text | `--ink-2` |
| Captions / tertiary | `--ink-3` |
| Borders | `--hairline` (opaque, not a black alpha) |
| Brand accent | `--sage`, `--sage-light`, `--sage-dark` |
| Food / energy | `--terracotta` |
| Status | `--success`, `--gold` |

Type pair: **Fraunces** (display) + **Inter** (body).

### Weights

| role | CSS | face |
|---|---|---|
| regular | `font-normal` 400 | `Inter_400Regular` |
| medium | `font-medium` 500 | `Inter_500Medium` |
| semibold | `font-semibold` 600 | `Inter_600SemiBold` |
| bold | `font-bold` 700 | `Inter_700Bold` |
| display | 500 | `Fraunces_500Medium` |
| display semibold | `font-semibold` 600 | `Fraunces_600SemiBold` |

**On the Expo client a weight is a family name, not a number.** `@expo-google-fonts/*` ships
one static file per weight rather than a variable font, so there is no `font-weight` that
retargets which file renders — `fontWeight: '700'` on a family loaded at 400 cannot produce
bold, and what it does instead (synthesise, ignore, fall back to the system face) differs by
platform. This one fact is what 52 of mobile's 55 weight declarations got wrong. Write
`fontFamily: fonts.bold`; a numeric `fontWeight` may sit beside it, never instead of it.
`packages/shared/src/tokens/typography.ts` holds both vocabularies in one table.

**There is no 800.** `font-extrabold` appears at 34 web call sites, and `frontend/index.html`
requests Inter at `wght@300;400;500;600;700` — nothing serves 800, so the browser synthesises
or clamps it. Mobile maps 800 to `Inter_700Bold` rather than loading a real 800 face, which
would render *heavier* than the reference. **This is an open web-side decision**: either add
`800` to the Google Fonts URL or change those 34 to `font-bold`. Recorded here so the next
audit does not re-derive it.

Two titles, and neither is what the base stylesheet says. `index.css` gives `h1`/`h2`
Fraunces 500, and both components that render a title override it — `ui/page.tsx`'s
`PageHeader` is `font-sans text-[28px] font-extrabold` (Inter, not Fraunces at all) and
`Base44Layout.tsx:228`'s app bar is `font-display text-lg font-semibold` (Fraunces 600).
Match the rendered surface, not the base rule.

## Elevation and radius

Shadows come from the scale, not ad-hoc values:

```
shadow-xs · shadow-card · shadow-card-md · shadow-card-lg
```

Every radius derives from `--radius` (0.875rem), so the scale moves as one:

| token | value |
|---|---|
| `rounded-sm` | 10px |
| `rounded-md` | 12px |
| `rounded-lg` | 14px |
| `rounded-xl` | 18px |
| `rounded-2xl` | 22px |
| `rounded-3xl` | 30px |

Cards use `rounded-2xl` or larger. Never write a bracket value — `rounded-[22px]` is
`rounded-2xl`, and a radius that isn't on the scale is a new scale step, not a one-off.

Pick by element size, not just by role: at 18px, `rounded-xl` is half the height of a 36px
control, so a small icon button rendered with it is a circle. Below ~44px, use `rounded-md`
or `rounded-full` and mean it.

- Prefer an existing `components/ui/` primitive (shadcn) over a new styled div.
- New colors go in `index.css` as tokens first, then get used — a one-off color in a component is a bug.

## What the Expo client shares, and where it diverges

`packages/shared/src/tokens/` transcribes this file for the Expo client: `radii` carries
`sm 10 · md 12 · lg 14 · xl 18 · xxl 22` (the `2xl` card radius above, under the package's
own naming), and `spacing` names six of Tailwind's steps. **The named steps are not the whole
scale** — the web also uses the half-steps (`gap-1.5`, `mt-0.5`, `py-2.5`, `p-3.5`), so those
are legitimate on both clients even though only `0.5` has a name (`xxs`).

`rounded-3xl` is deliberately absent from the shared scale: zero usages here today, and an
unused step is a step that drifts.

The shadow scale needs one warning. This file says shadows come from
`shadow-xs · shadow-card · shadow-card-md · shadow-card-lg`, and `card.tsx` does use
`shadow-card` — but `tailwind.config.js` adds those four without removing Tailwind's stock
`sm`/`md`/`lg`, and the codebase reaches for the stock ones slightly more often (≈40 uses
against ≈29). They are different shadows: `shadow-card` is two layers of a warm
`hsl(28 20% 20%)`, Tailwind's `shadow-sm` is one neutral `rgb(0 0 0 / 0.05)`. **This standard
is the intent**, and the Expo client follows it. The stock usages here are a web-side
inconsistency worth a separate cleanup, not a second answer.

For Paper's `roundness` — which is a multiplier, not a radius — see `mobile/design-tokens`.
