/**
 * What Home's header says.
 *
 * Copy, not arithmetic — which is exactly why it is here rather than written out twice. The
 * two clients had drifted into different greetings for the same account (the web "Hey Yoni"
 * over a message that changes as the day goes on, Expo "Good morning, Yoni Ripp" over the
 * date), and a second copy of four strings is how that happens again.
 */

/** What Home calls someone whose account has no name on it. */
export const FALLBACK_FIRST_NAME = 'there';

/**
 * The first word of a display name — "Hey Yoni", never "Hey Yoni Ripp".
 *
 * A greeting is the one place a full name reads as formal rather than friendly, and it is
 * also the place most likely to overflow: "Hey" plus a three-part name at 390px wraps the
 * screen's largest type onto a second line.
 */
export function firstNameOf(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : FALLBACK_FIRST_NAME;
}

/**
 * The line under the greeting, keyed on how much has been logged today.
 *
 * Thresholds and wording are the web's (`frontend/src/pages/Home.tsx`), which is the
 * reference client. Meals rather than calories deliberately: it answers "have you been
 * tracking today", which is a question the user can act on, and it does not need a target
 * to be set before it says anything.
 */
export function homeProgressMessage(mealsCount: number): string {
  if (mealsCount <= 0) return 'Start tracking your progress';
  if (mealsCount >= 3) return 'Crushing it!';
  if (mealsCount >= 2) return 'Great progress!';
  return 'Keep going!';
}
