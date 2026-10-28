import type { DateFormat } from '@trackvibe/shared/settings';
import {
  DOB_PART_LABELS,
  dobPartOrder,
  dobSeparator,
  joinDob,
  splitDob,
} from '../dateOfBirth';
import { emptyWizardForm } from '../profileForm';

/**
 * Date of birth, decomposed into three numeric fields — the same day/month/year split the
 * web's `frontend/src/components/settings/DateOfBirthInput.tsx` uses.
 *
 * Three inputs rather than a native wheel: `@react-native-community/datetimepicker` is a
 * native module, and `mobile/CLAUDE.md` is explicit that a new native module means everyone
 * rebuilds their dev client and must be flagged rather than assumed. It is the same call
 * `components/shared/DayPicker.tsx` already made and documented for the same reason.
 */

describe('splitDob', () => {
  it('splits the day string the API returns', () => {
    expect(splitDob('1990-04-17')).toEqual({ yyyy: '1990', mm: '04', dd: '17' });
  });

  it('gives three empty parts for a profile with no date of birth', () => {
    expect(splitDob('')).toEqual({ yyyy: '', mm: '', dd: '' });
  });

  it('refuses to guess at a value that is not a day string', () => {
    expect(splitDob('17/04/1990')).toEqual({ yyyy: '', mm: '', dd: '' });
  });
});

describe('joinDob', () => {
  it('pads a single-digit month and day into the API day string', () => {
    expect(joinDob('1990', '4', '7')).toBe('1990-04-07');
  });

  /**
   * The case the naive `${y}-${m}-${d}` build gets wrong. 31 February is not a date, and
   * `new Date(1990, 1, 31)` silently rolls forward to 3 March rather than rejecting — so a
   * user who typed it would have a different birthday stored than the one they entered.
   */
  it('rejects a day that does not exist in that month rather than rolling it forward', () => {
    expect(joinDob('1990', '2', '31')).toBe('');
  });

  it('accepts 29 February in a leap year', () => {
    expect(joinDob('2000', '2', '29')).toBe('2000-02-29');
  });

  it('rejects 29 February in a common year', () => {
    expect(joinDob('1999', '2', '29')).toBe('');
  });

  it('holds its peace until the year is fully typed', () => {
    expect(joinDob('199', '4', '17')).toBe('');
  });

  it('is empty when nothing has been entered', () => {
    expect(joinDob('', '', '')).toBe('');
  });

  it('rejects a month outside the calendar', () => {
    expect(joinDob('1990', '13', '1')).toBe('');
  });

  /**
   * Nobody is born in the future, and the value feeds the AI prompt builders
   * (`backend/src/services/chat.ts:125-136`) which turn it into an age — so a typo'd 2090
   * becomes a negative age in the model's context rather than an obviously wrong date.
   *
   * The web passes `maxYear` to the same control but spends it on an `<input max>`, which
   * browsers treat as advisory and do not stop anyone typing past. Enforced here instead.
   */
  it('rejects a year past the newest one allowed', () => {
    expect(joinDob('2090', '4', '17', 2026)).toBe('');
  });

  it('accepts the newest year allowed', () => {
    expect(joinDob('2026', '4', '17', 2026)).toBe('2026-04-17');
  });

  it('allows any year when no ceiling is given', () => {
    expect(joinDob('2090', '4', '17')).toBe('2090-04-17');
  });
});

describe('dobPartOrder', () => {
  it('orders the fields the way the user reads dates', () => {
    expect(dobPartOrder('DD/MM/YYYY')).toEqual(['DD', 'MM', 'YYYY']);
    expect(dobPartOrder('MM/DD/YYYY')).toEqual(['MM', 'DD', 'YYYY']);
    expect(dobPartOrder('YYYY-MM-DD')).toEqual(['YYYY', 'MM', 'DD']);
  });

  /**
   * Not a type-impossible branch. `loadStoredSettings` does `{ ...DEFAULT_SETTINGS, ...parsed }`
   * over whatever JSON is in AsyncStorage with no validation, so a blob carrying a
   * `dateFormat` this build does not know reaches here as a plain string. The web guards the
   * same way (`DateOfBirthInput.tsx:116`).
   */
  it('falls back to day-first for a stored date format it does not recognise', () => {
    expect(dobPartOrder('nonsense' as DateFormat)).toEqual(['DD', 'MM', 'YYYY']);
  });
});

describe('dobSeparator', () => {
  it('uses the separator that belongs to the format', () => {
    expect(dobSeparator('DD/MM/YYYY')).toBe('/');
    expect(dobSeparator('MM/DD/YYYY')).toBe('/');
    expect(dobSeparator('YYYY-MM-DD')).toBe('-');
  });

  it('falls back to a slash for a stored date format it does not recognise', () => {
    expect(dobSeparator('nonsense' as DateFormat)).toBe('/');
  });
});

describe('DOB_PART_LABELS', () => {
  /**
   * These are the accessible names, and the only way to address the three fields in a test
   * or with a screen reader — "DD" read aloud on its own is not a label.
   */
  it('names each field for a screen reader rather than leaving it as two letters', () => {
    expect(DOB_PART_LABELS).toEqual({ DD: 'Day', MM: 'Month', YYYY: 'Year' });
  });
});

describe('emptyWizardForm', () => {
  it('starts cycle tracking off, so the wizard never enables it unasked', () => {
    expect(emptyWizardForm()).toMatchObject({ cycleTrackingEnabled: false });
  });

  // Matches `SetupWizard.tsx:28` — the field is pre-filled, so a user who enables tracking
  // and says nothing else still gets a usable length rather than a blank.
  it('pre-fills the cycle length the way the web does', () => {
    expect(emptyWizardForm()).toMatchObject({ averageCycleLength: '28' });
  });
});
