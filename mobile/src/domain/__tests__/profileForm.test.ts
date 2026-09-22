import {
  PROFILE_WEIGHT_UNIT,
  bmiFor,
  profileSectionPayload,
  profileToForm,
  wizardFinishPayload,
  WIZARD_SKIP_PAYLOAD,
  emptyProfileForm,
} from '../profileForm';
import type { ApiProfile } from '../../core/api/health';

/**
 * The profile form's arithmetic, tested as the plain functions it is.
 *
 * Nothing here renders. A React Query client in a test leaves a notifyManager batch timer
 * that outlives the run and hangs jest — the reason `buildWorkoutUpdateBody` and
 * `filterCatalog` are free functions too (`useExercises.test.ts` documents it) — and every
 * rule worth pinning here is pure.
 */

const profile = (over: Partial<ApiProfile> = {}): ApiProfile => ({
  setupCompleted: false,
  waterGoalGlasses: 8,
  cycleTrackingEnabled: false,
  ...over,
});

describe('PROFILE_WEIGHT_UNIT', () => {
  /**
   * The tag is a constant because the column provably is one.
   *
   * `weight_entries` needed a per-row `unit` because `getWeightUnit` relabelled its field to
   * `lbs` without converting, so an imperial user's pounds were stored raw. `user_profiles`
   * has no such history: its only two writers, `frontend/src/components/settings/
   * ProfileSection.tsx:97` and `onboarding/SetupWizard.tsx:152`, both hardcode "(kg)" and
   * always have. So kilograms is what is in the column, and `displayWeight` can be given
   * that as the stored unit rather than guessing from the viewer's preference.
   *
   * This is pinned as a test rather than left as a comment because the day someone adds a
   * unit column to `user_profiles` is the day this constant has to stop being a constant.
   */
  it('is kilograms — the unit user_profiles has always been written in', () => {
    expect(PROFILE_WEIGHT_UNIT).toBe('kg');
  });
});

describe('bmiFor', () => {
  it('computes BMI from centimetres and kilograms for a metric user', () => {
    expect(bmiFor('170', '70', 'metric')).toBe('24.2');
  });

  /**
   * The imperial case is the one worth pinning: the field holds pounds, and BMI is only
   * defined over kilograms. Reading 154.3 as kilograms would report a BMI of 53.4.
   */
  it('converts a weight typed in pounds before computing, rather than reading it as kilograms', () => {
    expect(bmiFor('170', '154.3', 'imperial')).toBe('24.2');
  });

  it('has no answer until both height and weight are present', () => {
    expect(bmiFor('170', '', 'metric')).toBeNull();
    expect(bmiFor('', '70', 'metric')).toBeNull();
  });

  // Guards the `/0` that a partially typed height would otherwise produce: `70 / 0` is
  // Infinity, and `Infinity.toFixed(1)` is the string "Infinity" — rendered, not caught.
  it('has no answer for a height of zero rather than reporting Infinity', () => {
    expect(bmiFor('0', '70', 'metric')).toBeNull();
  });

  /**
   * Squaring the height loses the sign, so a negative one does not divide by zero — it
   * quietly produces a plausible-looking number from an impossible body. -170 cm reads as
   * the same 24.2 as 170 cm, which is worse than an error because nothing about it looks
   * wrong.
   *
   * Reachable: `keyboardType="numeric"` offers a minus key on several Android keyboards,
   * and a paste is always possible.
   */
  it('has no answer for a negative height rather than squaring the sign away', () => {
    expect(bmiFor('-170', '70', 'metric')).toBeNull();
  });

  it('has no answer for a negative weight', () => {
    expect(bmiFor('170', '-70', 'metric')).toBeNull();
  });
});

describe('profileToForm', () => {
  it('normalises an ISO datetime date of birth down to the day string the API takes', () => {
    expect(profileToForm(profile({ dateOfBirth: '1990-04-17T00:00:00.000Z' }), 'metric'))
      .toMatchObject({ dateOfBirth: '1990-04-17' });
  });

  it('drops a date of birth it cannot read rather than seeding the field with it', () => {
    expect(profileToForm(profile({ dateOfBirth: 'not a date' }), 'metric'))
      .toMatchObject({ dateOfBirth: '' });
  });

  it('seeds the stored kilograms unchanged for a metric user', () => {
    expect(profileToForm(profile({ currentWeight: 70, targetWeight: 65 }), 'metric'))
      .toMatchObject({ currentWeight: '70', targetWeight: '65' });
  });

  it('seeds the stored kilograms as pounds for an imperial user', () => {
    expect(profileToForm(profile({ currentWeight: 70 }), 'imperial'))
      .toMatchObject({ currentWeight: '154.3' });
  });

  it('falls back to the column default for a profile with no water goal', () => {
    expect(profileToForm(profile(), 'metric')).toMatchObject({ waterGoalGlasses: '8' });
  });

  it('leaves every unset field blank rather than inventing a value', () => {
    expect(profileToForm(profile(), 'metric')).toMatchObject(emptyProfileForm());
  });
});

describe('profileSectionPayload', () => {
  const filled = {
    ...emptyProfileForm(),
    sex: 'female',
    dateOfBirth: '1990-04-17',
    heightCm: '170',
    currentWeight: '70',
    targetWeight: '65',
    activityLevel: 'moderate',
    waterGoalGlasses: '10',
  };

  it('sends what the user typed, for a metric user', () => {
    expect(profileSectionPayload(filled, 'metric')).toEqual({
      sex: 'female',
      dateOfBirth: '1990-04-17',
      heightCm: 170,
      currentWeight: 70,
      targetWeight: 65,
      activityLevel: 'moderate',
      waterGoalGlasses: 10,
    });
  });

  /**
   * The other half of the round trip in `profileToForm`. An imperial user types pounds; the
   * column is kilograms; so the conversion happens here, at the input edge, and 154.3 lbs
   * goes back as the 70 kg it came from.
   */
  it('converts a weight typed in pounds back to the kilograms the column stores', () => {
    expect(profileSectionPayload({ ...filled, currentWeight: '154.3' }, 'imperial'))
      .toMatchObject({ currentWeight: 70 });
  });

  /**
   * `backend/src/models/profile.ts:77-95` omits absent fields from the INSERT so the column
   * DEFAULT applies; an explicit null or zero would bypass that and 23502 on a brand-new
   * user's first write. So a blank field must be `undefined`, never `''` and never `0`.
   */
  it('omits a field the user left blank instead of sending an empty string or a zero', () => {
    const payload = profileSectionPayload(emptyProfileForm(), 'metric');

    expect(payload.sex).toBeUndefined();
    expect(payload.dateOfBirth).toBeUndefined();
    expect(payload.heightCm).toBeUndefined();
    expect(payload.currentWeight).toBeUndefined();
    expect(payload.targetWeight).toBeUndefined();
    expect(payload.activityLevel).toBeUndefined();
  });

  // The web's own fallback (`ProfileSection.tsx:52`): the water goal is NOT NULL, so unlike
  // every other field it gets a value rather than being omitted.
  it('falls back to eight glasses rather than omitting the NOT NULL water goal', () => {
    expect(profileSectionPayload(emptyProfileForm(), 'metric'))
      .toMatchObject({ waterGoalGlasses: 8 });
  });

  it('never reports the units preference, which is the Units radio\'s to own', () => {
    expect(profileSectionPayload(filled, 'imperial')).not.toHaveProperty('units');
  });
});

describe('wizardFinishPayload', () => {
  const wizardForm = {
    ...emptyProfileForm(),
    sex: 'female',
    heightCm: '170',
    currentWeight: '70',
    cycleTrackingEnabled: true,
    averageCycleLength: '30',
  };

  it('completes the setup, which is what stops the wizard coming back', () => {
    expect(wizardFinishPayload(wizardForm, 'metric')).toMatchObject({ setupCompleted: true });
  });

  it('carries the cycle length when tracking is on', () => {
    expect(wizardFinishPayload(wizardForm, 'metric')).toMatchObject({
      cycleTrackingEnabled: true,
      averageCycleLength: 30,
    });
  });

  // Matches `SetupWizard.handleFinish:57` — the length is meaningless with tracking off, and
  // sending it would write a number the user never confirmed.
  it('omits the cycle length when tracking is off', () => {
    const payload = wizardFinishPayload(
      { ...wizardForm, cycleTrackingEnabled: false },
      'metric'
    );

    expect(payload.cycleTrackingEnabled).toBe(false);
    expect(payload.averageCycleLength).toBeUndefined();
  });

  // The wizard has no water-goal step on either client; `ProfileSection` owns that field.
  it('does not write a water goal the wizard never asked for', () => {
    expect(wizardFinishPayload(wizardForm, 'metric')).not.toHaveProperty('waterGoalGlasses');
  });

  it('converts the body weights the same way the settings form does', () => {
    expect(wizardFinishPayload({ ...wizardForm, currentWeight: '154.3' }, 'imperial'))
      .toMatchObject({ currentWeight: 70 });
  });
});

describe('WIZARD_SKIP_PAYLOAD', () => {
  /**
   * `SetupWizard.handleSkip:38-45` writes exactly this and nothing else. Skipping has to be
   * distinguishable from never having started — a row with `setup_completed = true` and
   * nothing else is the record that the user was asked and declined.
   */
  it('completes the setup without inventing a single value the user did not give', () => {
    expect(WIZARD_SKIP_PAYLOAD).toEqual({ setupCompleted: true });
  });
});
