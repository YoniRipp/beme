import type { DateFormat } from '@trackvibe/shared/settings';

/**
 * Date of birth as three numeric parts, and the rules for turning them back into the
 * `YYYY-MM-DD` day string `PUT /api/profile` takes.
 *
 * Transcribed from `frontend/src/components/settings/DateOfBirthInput.tsx` so the two
 * clients validate a birthday identically — the web's version keeps this logic inside the
 * component, where it cannot be tested without a DOM.
 *
 * **Why three fields and not a wheel.** A native date picker means
 * `@react-native-community/datetimepicker`, and `mobile/CLAUDE.md` says plainly: "Don't add
 * other native modules without flagging it … every new native module means everyone
 * rebuilds their dev client." `components/shared/DayPicker.tsx` already made and documented
 * this exact call. A birth date is also the one date nobody scrolls to — it is four digits
 * you know by heart and a wheel makes you spin through three hundred months to reach them.
 */

export type DobPart = 'DD' | 'MM' | 'YYYY';

/**
 * The accessible name for each field. "DD" is a placeholder, not a label: read aloud on its
 * own it says nothing, and it is also how a test addresses the three boxes.
 */
export const DOB_PART_LABELS: Record<DobPart, string> = {
  DD: 'Day',
  MM: 'Month',
  YYYY: 'Year',
};

/** Longest each field can get, which is also how many digits it accepts. */
export const DOB_PART_MAX_LENGTH: Record<DobPart, number> = { DD: 2, MM: 2, YYYY: 4 };

const ORDER: Record<DateFormat, DobPart[]> = {
  'DD/MM/YYYY': ['DD', 'MM', 'YYYY'],
  'MM/DD/YYYY': ['MM', 'DD', 'YYYY'],
  'YYYY-MM-DD': ['YYYY', 'MM', 'DD'],
};

const SEPARATOR: Record<DateFormat, string> = {
  'DD/MM/YYYY': '/',
  'MM/DD/YYYY': '/',
  'YYYY-MM-DD': '-',
};

/**
 * Both lookups fall back rather than indexing blind.
 *
 * Not defensiveness for its own sake: `loadStoredSettings` merges the AsyncStorage blob over
 * `DEFAULT_SETTINGS` with no validation (`src/context/SettingsContext.tsx`), so a
 * `dateFormat` written by a different build — or corrupted — arrives here as a string this
 * build has no entry for, and an unguarded lookup would render three fields in `undefined`
 * order. The web guards the same way (`DateOfBirthInput.tsx:116-117`).
 */
export function dobPartOrder(dateFormat: DateFormat): DobPart[] {
  return ORDER[dateFormat] ?? ORDER['DD/MM/YYYY'];
}

export function dobSeparator(dateFormat: DateFormat): string {
  return SEPARATOR[dateFormat] ?? '/';
}

export interface DobParts {
  yyyy: string;
  mm: string;
  dd: string;
}

/** Split a stored `YYYY-MM-DD` into the three fields; anything else yields three blanks. */
export function splitDob(value: string): DobParts {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { yyyy: '', mm: '', dd: '' };
  const [yyyy, mm, dd] = value.split('-');
  return { yyyy, mm, dd };
}

/**
 * Whether a year/month/day triple is a date that exists.
 *
 * Built in UTC and then read back field by field, which is the whole point: `Date` accepts
 * 31 February and silently rolls it to 3 March, so the only way to reject an impossible day
 * is to ask the resulting date whether it is still the one you asked for. UTC rather than
 * local because a local-midnight construction can land on the previous day in a negative
 * offset and fail this check for a date that is perfectly real.
 */
function isRealDate(y: number, m: number, d: number): boolean {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * The three fields as the API's day string, or empty while they do not yet describe a date.
 *
 * Empty covers "still typing", "not a real day" and "not a possible birthday", and the
 * caller treats all three the same — none of them is something to save.
 *
 * `maxYear` is a ceiling, not a hint. The web hands the same number to an `<input max>`,
 * which browsers treat as advisory and do not stop anyone typing past, so a future birth
 * date is reachable there; here it simply never becomes a value. It matters because
 * `backend/src/services/chat.ts:125-136` turns this date into an age for the model, and a
 * typo'd 2090 reaches the AI as a negative one.
 */
export function joinDob(yyyy: string, mm: string, dd: string, maxYear?: number): string {
  if (yyyy.length !== 4 || !mm || !dd) return '';
  const y = Number(yyyy);
  const m = Number(mm);
  const d = Number(dd);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return '';
  if (maxYear !== undefined && y > maxYear) return '';
  if (!isRealDate(y, m, d)) return '';
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
