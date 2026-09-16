/**
 * Semantic colour roles, shared by both clients.
 *
 * Source of truth: `frontend/src/index.css` (`:root` for light, `.dark` for dark) —
 * the web client's actual design tokens, which went through an accessibility pass
 * (see `agent-os/specs/2026-08-14-1300-palette-a11y-and-logging-speed`). The web
 * expresses these as HSL triples for Tailwind/shadcn; the values below are the same
 * colours converted to hex so a client that doesn't speak CSS custom properties
 * (React Native) can use them directly. Do not hand-tune these independently of the
 * web palette — if the web palette changes, re-derive these from it.
 *
 * `role -> css custom property` (light / dark):
 *   background   -> --paper                  surface     -> --card
 *   surfaceMuted -> --paper-2                 text        -> --ink
 *   textMuted    -> --ink-3 (--muted-foreground)  border  -> --hairline
 *   muted        -> --muted                   scrim       -> --scrim
 *   primary      -> --primary (--sage-dark / --sage)
 *   primaryForeground -> --primary-foreground (fixed light value / `var(--paper)`)
 *   primarySoft  -> --sage-50                 food        -> --terracotta
 *   foodSoft     -> --terracotta-light        workout     -> --info
 *   sleep        -> --gold                    danger      -> --destructive
 *   success      -> --success                 shadow      -> the --shadow-* hue
 *
 * THE TRAP — `muted` and `surfaceMuted` are DIFFERENT COLOURS. The names read as
 * synonyms; the values are not, and reaching for the wrong one has already happened
 * twice in review. `surfaceMuted` is `--paper-2`, the ground under a muted *section*.
 * `muted` is `--muted`, the fill the web draws every progress track with — five ring
 * `stroke`s (`ui/progress-ring.tsx`, `insights/AiInsightsSection.tsx`,
 * `goals/GoalCard.tsx`, `home/MacroCircles.tsx`, `pages/Energy.tsx`) plus
 * `home/WaterTracker.tsx`'s bar and `body/WorkoutCard.tsx`'s rows. (NOT `ui/progress.tsx`
 * — the spec cites it, but that shadcn primitive is `bg-secondary` and nothing renders
 * it; the bars the web actually draws are hand-rolled `bg-muted` divs.) Against the
 * `surface` card those tracks sit on, in dark —
 * the theme that ships as the default:
 *
 *   surfaceMuted `#1b1a18` on `#191715` = 1.03:1   (invisible: ~5 units per channel)
 *   muted        `#292624` on `#191715` = 1.19:1   (quiet, but there)
 *
 * At 1.03:1 a ring's unfilled remainder cannot be seen, so the ring reads as complete
 * at every value — a silent failure. Trace the web call site before picking between
 * these two; do not pick by name.
 *
 * `shadow` is the colour the web's `--shadow-*` box-shadows are composited from, not a
 * shadow definition: light's four shadow steps are all `hsl(28 20% 20% / …)` (a warm
 * near-black), dark's are all `hsl(0 0% 0% / …)`. It exists so Android elevation has
 * something to read other than a hardcoded `#000`.
 *
 * `primaryForeground` is the text/icon colour meant to sit ON TOP of `primary` — the
 * web pairs the two everywhere `--primary` is a background (see
 * `frontend/src/hooks/useThemeEffect.ts`, which overrides both together). Light's
 * `--primary-foreground` is a fixed `36 40% 98%` (`#fcfaf8`); dark's is
 * `var(--paper)` = `30 8% 6%`, which is `#110f0e` — identical to this file's own
 * `darkColors.background`, not a coincidence, just the same "near-black paper" value
 * reused as a foreground.
 *
 * `workoutSoft` and `sleepSoft` have no counterpart on the web — it never needed an
 * "info-soft" or "gold-soft" role the way it needed `--terracotta-light` for food.
 * Rather than invent new colours for this task, those two keep the values mobile
 * already shipped with (`mobile/src/theme.ts` before this change).
 */
export interface ColorRoles {
  background: string;
  surface: string;
  surfaceMuted: string;
  /** `--muted`. The track/fill role — NOT `surfaceMuted`; see THE TRAP above. */
  muted: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryForeground: string;
  primarySoft: string;
  food: string;
  foodSoft: string;
  workout: string;
  workoutSoft: string;
  sleep: string;
  sleepSoft: string;
  danger: string;
  success: string;
  /** `--scrim`. The ground a modal/drawer overlay is composited from (the web uses it at 50%). */
  scrim: string;
  /** The hue the web's `--shadow-*` steps are built on — a colour, not a shadow. */
  shadow: string;
}

export const lightColors: ColorRoles = {
  background: '#faf8f4',
  surface: '#ffffff',
  surfaceMuted: '#f5f0eb',
  muted: '#f0edea',
  text: '#29241f',
  textMuted: '#756961',
  border: '#e0dcd6',
  primary: '#37624d',
  primaryForeground: '#fcfaf8',
  primarySoft: '#eff6f2',
  food: '#ce6546',
  foodSoft: '#f7e4de',
  workout: '#3376c1',
  workoutSoft: '#e6f0fa', // no web counterpart — carried over from mobile's prior value
  sleep: '#d99726',
  sleepSoft: '#f8efd8', // no web counterpart — carried over from mobile's prior value
  danger: '#db3624',
  success: '#358d61',
  scrim: '#171312',
  shadow: '#3d3229',
};

export const darkColors: ColorRoles = {
  background: '#110f0e',
  surface: '#191715',
  surfaceMuted: '#1b1a18',
  muted: '#292624',
  text: '#f4f3f0',
  textMuted: '#a59e97',
  border: '#2e2b28',
  primary: '#64c491',
  primaryForeground: '#110f0e', // var(--paper) on the web — identical to `background` above
  primarySoft: '#17261e',
  food: '#e27a5a',
  foodSoft: '#462920',
  workout: '#67a4e9',
  workoutSoft: '#142636', // no web counterpart — carried over from mobile's prior value
  sleep: '#ecb351',
  sleepSoft: '#352a14', // no web counterpart — carried over from mobile's prior value
  danger: '#d54e3f',
  success: '#5bb98a',
  scrim: '#000000',
  shadow: '#000000',
};

/** Default role map — light mode, matching how each client already treated "colors". */
export const colors: ColorRoles = lightColors;
