import { convertWeight, unitForSystem, type WeightUnit } from '@trackvibe/shared/domain';
import type { Units } from '@trackvibe/shared/settings';
import type { ApiProfile } from '../core/api/health';

/**
 * The fitness profile form's arithmetic — seeding it from the server, turning it back into a
 * `PUT /api/profile` body, and the BMI readout.
 *
 * Here rather than inside a component because two screens need the identical rules: the
 * Settings profile section and the first-run wizard. The web has the same logic twice, once
 * in `frontend/src/components/settings/ProfileSection.tsx` and once in
 * `onboarding/SetupWizard.tsx`, and the two have already drifted — the wizard writes the
 * cycle fields and no water goal, the settings form the reverse. Sharing it here means the
 * partial-write rule below cannot come loose on one screen and hold on the other.
 *
 * Pure, and deliberately so: `useExercises.test.ts` records that a React Query client in a
 * test leaves a notifyManager batch timer that outlives the run and hangs jest, so the
 * logic worth testing lives outside the hooks.
 */

/**
 * The unit `user_profiles.current_weight` and `target_weight` are stored in.
 *
 * A constant, where `weight_entries` needed a per-row column — and the difference is the
 * whole safety argument, so it is worth stating rather than assuming.
 *
 * `weight_entries.weight` became ambiguous because `getWeightUnit` relabelled its field to
 * `lbs` for imperial users without converting the number, so pounds were stored raw in a
 * column the domain defines as kilograms. `user_profiles` never had that: its only two
 * writers — `frontend/src/components/settings/ProfileSection.tsx:97` and
 * `onboarding/SetupWizard.tsx:152` — both hardcode the label "(kg)", and always have. So
 * kilograms is not a guess about these columns, it is what every value in them was entered
 * as, and `displayWeight`'s "the unit the ROW is in" can honestly be answered with it.
 *
 * What this must NOT become is a read of `profile.units`. That field is the user's chosen
 * measurement SYSTEM, and `SettingsScreen.reportUnits` rewrites it every time the Units
 * radio moves — so treating it as the tag would silently re-read a stored 80 kg as 80 lbs
 * the moment somebody switched to imperial. That is exactly the re-interpretation
 * `packages/shared/src/domain/units.ts` exists to have prevented.
 */
export const PROFILE_WEIGHT_UNIT: WeightUnit = 'kg';

/** The profile fields the Settings form edits, as the strings a `TextInput` holds. */
export interface ProfileFormValues {
  sex: string;
  /** `YYYY-MM-DD`, or empty. Never a datetime — the API takes a plain day string. */
  dateOfBirth: string;
  heightCm: string;
  /** In the user's own system, not in kilograms. Converted at both edges, never stored raw. */
  currentWeight: string;
  targetWeight: string;
  activityLevel: string;
  waterGoalGlasses: string;
}

/** The wizard collects the same body fields, plus the cycle pair, and no water goal. */
export interface WizardFormValues extends ProfileFormValues {
  cycleTrackingEnabled: boolean;
  averageCycleLength: string;
}

/**
 * The values `sex` and `activity_level` may take.
 *
 * Contract, not copy. They are written to `user_profiles` and read back by the AI prompt
 * builders (`backend/src/services/insights.ts:159-176`, `chat.ts:125-136`), so an invented
 * value would be a data bug rather than a wording difference. Verbatim from
 * `frontend/src/components/settings/ProfileSection.tsx:72-77` and `:111-115`; the activity
 * descriptions are the wizard's (`SetupWizard.tsx:193-199`), which the settings form has no
 * room for and does not show.
 *
 * Here rather than in either component because both screens write the same column, and a
 * fifth activity level added to one and not the other is the kind of drift that only shows
 * up as a CHECK violation in production.
 */
export const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little to no exercise' },
  { value: 'light', label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
  { value: 'active', label: 'Active', description: 'Hard exercise 6-7 days/week' },
  { value: 'very_active', label: 'Very Active', description: 'Very hard exercise, physical job' },
] as const;

/** The label for a stored activity value, for the wizard's closing summary. */
export function activityLabel(value: string): string {
  return ACTIVITY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/** The web's own fallback (`ProfileSection.tsx:38`), matching the column's NOT NULL DEFAULT 8. */
const DEFAULT_WATER_GOAL_GLASSES = 8;

/** The web's default in both the wizard and the settings form (`SetupWizard.tsx:28`). */
const DEFAULT_CYCLE_LENGTH_DAYS = '28';

export function emptyProfileForm(): ProfileFormValues {
  return {
    sex: '',
    dateOfBirth: '',
    heightCm: '',
    currentWeight: '',
    targetWeight: '',
    activityLevel: '',
    waterGoalGlasses: String(DEFAULT_WATER_GOAL_GLASSES),
  };
}

export function emptyWizardForm(): WizardFormValues {
  return {
    ...emptyProfileForm(),
    cycleTrackingEnabled: false,
    averageCycleLength: DEFAULT_CYCLE_LENGTH_DAYS,
  };
}

/**
 * A number the user actually entered, or nothing.
 *
 * `undefined` rather than `0` or `''` is load-bearing: `backend/src/models/profile.ts:77-95`
 * omits absent fields from the INSERT so the column DEFAULT applies, and binding an explicit
 * null bypasses that and raises 23502 on a brand-new user's first write. That is the bug
 * that used to break new-user onboarding.
 */
function numberOrUndefined(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** A weight the user typed in their own system, as the kilograms the column stores. */
function weightToKg(value: string, system: Units): number | undefined {
  const entered = numberOrUndefined(value);
  if (entered === undefined) return undefined;
  return convertWeight(entered, unitForSystem(system), PROFILE_WEIGHT_UNIT);
}

/** A stored weight, as the string the field shows in the user's own system. */
function weightToField(value: number | undefined, system: Units): string {
  if (value === undefined || value === null) return '';
  return String(convertWeight(value, PROFILE_WEIGHT_UNIT, unitForSystem(system)));
}

/**
 * Accept either `YYYY-MM-DD` or an ISO datetime and keep the day; ignore anything else.
 * Transcribed from `ProfileSection.tsx:29-30` — the API returns the former
 * (`backend/src/models/profile.ts:10-23` formats the DATE column by hand precisely to avoid
 * the `toISOString` day rollback), but a cached or hand-written value may not.
 */
function normalizeDateOfBirth(value: string | undefined): string {
  if (!value) return '';
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '';
}

/** Seed the form from the server's profile. */
export function profileToForm(profile: ApiProfile, system: Units): ProfileFormValues {
  return {
    sex: profile.sex ?? '',
    dateOfBirth: normalizeDateOfBirth(profile.dateOfBirth),
    heightCm: profile.heightCm?.toString() ?? '',
    currentWeight: weightToField(profile.currentWeight, system),
    targetWeight: weightToField(profile.targetWeight, system),
    activityLevel: profile.activityLevel ?? '',
    waterGoalGlasses: (profile.waterGoalGlasses ?? DEFAULT_WATER_GOAL_GLASSES).toString(),
  };
}

/** The body fields both screens write, with blanks omitted. */
function bodyFields(form: ProfileFormValues, system: Units): Partial<ApiProfile> {
  return {
    sex: form.sex || undefined,
    dateOfBirth: form.dateOfBirth || undefined,
    heightCm: numberOrUndefined(form.heightCm),
    currentWeight: weightToKg(form.currentWeight, system),
    targetWeight: weightToKg(form.targetWeight, system),
    activityLevel: form.activityLevel || undefined,
  };
}

/**
 * What Save sends from the Settings profile section.
 *
 * `units` is deliberately absent. The Units radio owns that field
 * (`SettingsScreen.reportUnits`); a profile save that carried it would re-report a
 * preference the user did not touch on this screen.
 */
export function profileSectionPayload(
  form: ProfileFormValues,
  system: Units
): Partial<ApiProfile> {
  return {
    ...bodyFields(form, system),
    // The one field that gets a fallback rather than being omitted: the column is NOT NULL,
    // so there is no "absent" state for it to fall back into (`ProfileSection.tsx:52`).
    waterGoalGlasses: Number(form.waterGoalGlasses) || DEFAULT_WATER_GOAL_GLASSES,
  };
}

/** What "Get Started" sends at the end of the wizard (`SetupWizard.handleFinish:47-65`). */
export function wizardFinishPayload(
  form: WizardFormValues,
  system: Units
): Partial<ApiProfile> {
  return {
    ...bodyFields(form, system),
    cycleTrackingEnabled: form.cycleTrackingEnabled,
    averageCycleLength: form.cycleTrackingEnabled
      ? numberOrUndefined(form.averageCycleLength)
      : undefined,
    setupCompleted: true,
  };
}

/**
 * What Skip sends, and all it sends (`SetupWizard.handleSkip:38-45`).
 *
 * Skipping has to be distinguishable from never having started: a row carrying
 * `setup_completed = true` and nothing else is the record that this user was asked and
 * declined, which is what stops the wizard reappearing on every launch and on the web.
 */
export const WIZARD_SKIP_PAYLOAD: Partial<ApiProfile> = { setupCompleted: true };

/**
 * The BMI readout both screens show. A string because it is only ever rendered, and `null`
 * when there is nothing honest to render.
 *
 * Computed in kilograms whatever the field holds — BMI is defined over kg/m², so reading an
 * imperial user's 154.3 as kilograms would report 53.4 instead of 24.2.
 */
export function bmiFor(heightCm: string, weight: string, system: Units): string | null {
  const height = numberOrUndefined(heightCm);
  const weightKg = weightToKg(weight, system);
  // `!height` also catches 0, which would otherwise divide to Infinity and render the
  // literal string "Infinity" while the user was still typing the height.
  if (!height || !weightKg) return null;
  const metres = height / 100;
  return (weightKg / metres ** 2).toFixed(1);
}
