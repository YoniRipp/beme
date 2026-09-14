import { act, renderHook } from '@testing-library/react-native';
import { newGoalFormValues, useGoalFormState } from '../GoalFormScreen';
import type { Goal } from '../../types/goals';

/**
 * GoalFormScreen seeded its `useState` from `getGoalById(goalId)` exactly once, at mount.
 * Reach Edit before the goals query has resolved — a cold start into a restored navigation
 * state, or a dropped cache — and `existingGoal` was undefined, so the form initialised to
 * the CREATE defaults. The goal arriving a moment later updated only the screen title.
 * Filling in a target and pressing "Update Goal" then PATCHed `type` and `period` from
 * those defaults, silently rewriting the user's goal into a different one. That is data
 * corruption, not a display bug, which is why it is pinned here.
 *
 * `useGoalFormState` is the hook the screen's field state lives in, extracted so this can
 * be exercised with `renderHook` — mounting the screen itself would drag in `useGoals` and
 * a QueryClient, whose leftover notifyManager batch timer hangs the jest run (see
 * hooks/useWorkouts.ts's buildWorkoutUpdateBody for the same note).
 *
 * Note `await renderHook(...)` / `await rerender(...)`: RNTL 14 made both async.
 */

/** Differs from the create defaults in every field, so nothing can pass by coincidence. */
const monthlySleep: Goal = {
  id: 'g1',
  type: 'sleep',
  target: 8,
  period: 'monthly',
  createdAt: new Date(2026, 8, 1),
};

const monthlyCalories: Goal = {
  id: 'g2',
  type: 'calories',
  target: 2000,
  period: 'monthly',
  createdAt: new Date(2026, 8, 2),
};

const mountForm = (initialProps: Goal | undefined) =>
  renderHook((goal: Goal | undefined) => useGoalFormState(goal), { initialProps });

describe('useGoalFormState — seeding an edit', () => {
  it('THE BUG: fills the form from the goal when it resolves after mount', async () => {
    // Mount as the screen does on a cold start: the goals query has not come back yet.
    const { result, rerender } = await mountForm(undefined);
    expect(result.current.form).toEqual(newGoalFormValues());

    // The query resolves.
    await rerender(monthlySleep);

    expect(result.current.form).toEqual({ type: 'sleep', target: '8', period: 'monthly' });
  });

  it("does not leave today's create defaults in a form that is editing a goal", async () => {
    const { result, rerender } = await mountForm(undefined);
    await rerender(monthlySleep);

    // calories/daily is what a NEW goal starts as; PATCHing those over a sleep goal is the
    // corruption this guards.
    expect(result.current.form.type).not.toBe('calories');
    expect(result.current.form.period).not.toBe('daily');
    // workouts/weekly is what this screen used to start a new goal as, and therefore what
    // the pre-fix version actually sent.
    expect(result.current.form.type).not.toBe('workouts');
    expect(result.current.form.period).not.toBe('weekly');
  });

  it('seeds immediately when the goal is already in cache at mount', async () => {
    const { result } = await mountForm(monthlySleep);

    expect(result.current.form).toEqual({ type: 'sleep', target: '8', period: 'monthly' });
  });

  it('does not clobber what the user is typing when a refetch returns an equal object', async () => {
    const { result, rerender } = await mountForm(monthlyCalories);

    await act(async () => result.current.setTarget('2500'));
    expect(result.current.form.target).toBe('2500');

    // A background refetch hands back a new object with the same identity and values.
    await rerender({ ...monthlyCalories });

    expect(result.current.form.target).toBe('2500');
  });

  it('re-seeds when the form is pointed at a different goal', async () => {
    const { result, rerender } = await mountForm(monthlyCalories);

    await rerender(monthlySleep);

    expect(result.current.form).toEqual({ type: 'sleep', target: '8', period: 'monthly' });
  });
});

describe('useGoalFormState — defaults and the type/period coupling', () => {
  it('starts a new goal on daily calories, matching the web GoalModal', async () => {
    const { result } = await mountForm(undefined);

    // Was workouts/weekly here and calories/daily on the web — same button, different row.
    expect(result.current.form).toEqual({ type: 'calories', target: '', period: 'daily' });
  });

  it('moves a new goal to weekly when the type becomes workouts', async () => {
    const { result } = await mountForm(undefined);

    await act(async () => result.current.setType('workouts'));

    expect(result.current.form.type).toBe('workouts');
    expect(result.current.form.period).toBe('weekly');
  });

  it('moves back to daily when a new goal becomes a sleep goal', async () => {
    const { result } = await mountForm(undefined);

    await act(async () => result.current.setType('workouts'));
    await act(async () => result.current.setType('sleep'));

    expect(result.current.form.period).toBe('daily');
  });

  it("leaves an existing goal's period alone when its type is changed", async () => {
    // The web guards this with `!goal && …`: a user who deliberately picked "monthly"
    // should not lose it by re-tapping the type.
    const { result } = await mountForm(monthlyCalories);

    await act(async () => result.current.setType('workouts'));

    expect(result.current.form.type).toBe('workouts');
    expect(result.current.form.period).toBe('monthly');
  });

  it('keeps the period the user picks by hand', async () => {
    const { result } = await mountForm(undefined);

    await act(async () => result.current.setPeriod('yearly'));

    expect(result.current.form.period).toBe('yearly');
  });
});
