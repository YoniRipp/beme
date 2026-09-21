import { invalidationsFor } from '../useChat';
import { queryKeys } from '../../lib/queryKeys';

/**
 * The agent writes to the user's data through tool calls, so a turn can change workouts,
 * food, goals, weight, water, the cycle log or the profile without any screen knowing.
 * This is the mapping that re-reads what moved.
 *
 * Tested as a pure function rather than through the hook: driving it via React Query would
 * need a QueryClient and a rendered consumer, and what is actually worth pinning is the
 * intent table — which is data, and which has already drifted once on the web (see the two
 * intents below that `AiChatPanel` never mapped).
 */

const action = (intent: string, success = true) => ({ intent, success, message: 'ok' });

describe('invalidationsFor', () => {
  it('re-reads nothing when the turn was pure conversation', () => {
    expect(invalidationsFor([])).toEqual([]);
  });

  it('leaves the cache alone when the tool call failed', () => {
    // A failed `add_workout` wrote nothing, so refetching would spend a round trip to be
    // handed back exactly what is already cached.
    expect(invalidationsFor([action('add_workout', false)])).toEqual([]);
  });

  it('re-reads workouts after the agent logs one', () => {
    expect(invalidationsFor([action('add_workout')])).toContainEqual(queryKeys.workouts);
  });

  /**
   * The two the web's mapping is missing. `AiChatPanel` lists `delete_workout` but not
   * `delete_workouts` — the bulk clear the system prompt explicitly tells the model to use
   * for "wipe my workout log" — and lists no profile intent at all. Both are real `case`
   * labels in `executeOne` (`backend/src/services/voiceExecutor.ts`), so on the web those
   * two turns leave stale data on screen.
   */
  it('re-reads workouts after the BULK delete, which the web forgets', () => {
    expect(invalidationsFor([action('delete_workouts')])).toContainEqual(queryKeys.workouts);
  });

  it('re-reads the profile after the agent updates it, which the web forgets', () => {
    expect(invalidationsFor([action('update_profile')])).toContainEqual(queryKeys.profile);
  });

  it('re-reads every day of water, not just today, because the agent dates its own writes', () => {
    // `waterTodayAll` is the prefix. "Add three glasses to yesterday" must not leave
    // yesterday's cached count on screen.
    expect(invalidationsFor([action('add_water')])).toContainEqual(queryKeys.waterTodayAll);
  });

  it('files sleep under check-ins, where this client stores it', () => {
    expect(invalidationsFor([action('log_sleep')])).toContainEqual(queryKeys.checkIns);
  });

  /**
   * Home's streak card is computed from exactly these writes and has no key of its own in
   * the web's mapping, because the web spends that slot on `ai-insights`/`ai-today-recs` —
   * two reads this client has no screen for.
   */
  it('re-reads streaks after a write that can move one', () => {
    expect(invalidationsFor([action('add_food')])).toContainEqual(queryKeys.streaks);
  });

  it('does not touch streaks for a write that cannot move one', () => {
    expect(invalidationsFor([action('edit_goal')])).not.toContainEqual(queryKeys.streaks);
  });

  it('invalidates each key once however many actions hit it', () => {
    const keys = invalidationsFor([action('add_food'), action('add_food'), action('edit_food_entry')]);

    expect(keys.filter((k) => JSON.stringify(k) === JSON.stringify(queryKeys.foodEntries))).toHaveLength(1);
  });

  it('ignores an intent it has never heard of rather than throwing mid-turn', () => {
    // The model can only emit what the executor declares, but a new backend intent must
    // not break the turn that is already on screen.
    expect(() => invalidationsFor([action('teleport_user')])).not.toThrow();
    expect(invalidationsFor([action('teleport_user')])).toEqual([]);
  });

  it('collects every key a multi-tool turn touched', () => {
    const keys = invalidationsFor([action('add_workout'), action('add_food'), action('log_weight')]);

    expect(keys).toEqual(
      expect.arrayContaining([
        queryKeys.workouts,
        queryKeys.foodEntries,
        queryKeys.weightEntries,
        queryKeys.streaks,
      ]),
    );
  });
});
