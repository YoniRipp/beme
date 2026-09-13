import { buildWorkoutUpdateBody } from '../useWorkouts';

/**
 * `updateWorkout` used to build its request body from a hand-written allowlist of fields,
 * which silently omitted `completed`: a caller could set it, get no error, and find the
 * change had never been sent. Only the unchanged existing value was ever passed, so nothing
 * was losing data yet — it would have started the moment any control toggled the flag.
 * These cases pin the contract that every field the caller sets is forwarded.
 */
describe('buildWorkoutUpdateBody', () => {
  it('forwards `completed` instead of dropping it', () => {
    expect(buildWorkoutUpdateBody({ completed: true })).toEqual({ completed: true });
  });

  it('converts `date` to a local YYYY-MM-DD string', () => {
    expect(buildWorkoutUpdateBody({ date: new Date(2026, 8, 12), title: 'Leg day' }))
      .toEqual({ date: '2026-09-12', title: 'Leg day' });
  });

  it('sends only the fields the caller set', () => {
    expect(Object.keys(buildWorkoutUpdateBody({ notes: 'felt good' }))).toEqual(['notes']);
    expect(buildWorkoutUpdateBody({})).toEqual({});
  });

  it('forwards every field of a full workout update', () => {
    const body = buildWorkoutUpdateBody({
      title: 'W', type: 'cardio', durationMinutes: 45, notes: 'n',
      exercises: [], completed: false,
    });
    expect(Object.keys(body).sort())
      .toEqual(['completed', 'durationMinutes', 'exercises', 'notes', 'title', 'type']);
  });
});
