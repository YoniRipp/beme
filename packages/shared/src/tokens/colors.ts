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
 *   primary      -> --primary (--sage-dark / --sage)
 *   primarySoft  -> --sage-50                 food        -> --terracotta
 *   foodSoft     -> --terracotta-light        workout     -> --info
 *   sleep        -> --gold                    danger      -> --destructive
 *   success      -> --success
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
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primarySoft: string;
  food: string;
  foodSoft: string;
  workout: string;
  workoutSoft: string;
  sleep: string;
  sleepSoft: string;
  danger: string;
  success: string;
}

export const lightColors: ColorRoles = {
  background: '#faf8f4',
  surface: '#ffffff',
  surfaceMuted: '#f5f0eb',
  text: '#29241f',
  textMuted: '#756961',
  border: '#e0dcd6',
  primary: '#37624d',
  primarySoft: '#eff6f2',
  food: '#ce6546',
  foodSoft: '#f7e4de',
  workout: '#3376c1',
  workoutSoft: '#e6f0fa', // no web counterpart — carried over from mobile's prior value
  sleep: '#d99726',
  sleepSoft: '#f8efd8', // no web counterpart — carried over from mobile's prior value
  danger: '#db3624',
  success: '#358d61',
};

export const darkColors: ColorRoles = {
  background: '#110f0e',
  surface: '#191715',
  surfaceMuted: '#1b1a18',
  text: '#f4f3f0',
  textMuted: '#a59e97',
  border: '#2e2b28',
  primary: '#64c491',
  primarySoft: '#17261e',
  food: '#e27a5a',
  foodSoft: '#462920',
  workout: '#67a4e9',
  workoutSoft: '#142636', // no web counterpart — carried over from mobile's prior value
  sleep: '#ecb351',
  sleepSoft: '#352a14', // no web counterpart — carried over from mobile's prior value
  danger: '#d54e3f',
  success: '#5bb98a',
};

/** Default role map — light mode, matching how each client already treated "colors". */
export const colors: ColorRoles = lightColors;
