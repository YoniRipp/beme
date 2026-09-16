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
