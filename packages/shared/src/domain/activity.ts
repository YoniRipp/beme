/**
 * Recent activity — the merged "what you logged lately" feed both Homes show.
 *
 * Pure, React- and DOM-free, for the same reasons `domain/goals.ts` and `domain/targets.ts`
 * give: it is a data transform, both clients want exactly the same five rows, and the copy
 * in `detail` ("330 cal", "4 exercises") is part of what has to match. It reads no store —
 * both clients already hold the food entries and workouts this merges, so nothing here
 * costs a request.
 *
 * WHY IT SORTS THE WHOLE LIST rather than the web's original `slice(0, 10)` prefix on each
 * source. The API returns both collections `ORDER BY date DESC, created_at DESC`
 * (`backend/src/models/foodEntry.ts:53`, `backend/src/models/workout.ts:43`), so on a fresh
 * fetch the prefix IS the newest ten and the two are equivalent. They stop being equivalent
 * the moment a client writes its own cache: `useEnergy`'s `addFoodEntry` appends with
 * `[...prev, created]`, which puts the entry the user just logged at the END of the array.
 * A prefix would then show five stale rows and hide the new one — on the client where the
 * user had just logged it. Sorting by date is what "the five most recent" actually means,
 * and it is order-independent, so neither client's cache-write strategy can break it.
 */

/** The food fields this needs, structurally — shared never imports a client's types. */
export interface RecentActivityFoodSource {
  id: string;
  name: string;
  calories: number;
  date: Date;
}

/** The workout fields this needs, structurally. `exercises` is counted, never read into. */
export interface RecentActivityWorkoutSource {
  id: string;
  title: string;
  exercises: readonly unknown[];
  date: Date;
}

export interface RecentActivityItem {
  id: string;
  type: 'food' | 'workout';
  /** The food's name or the workout's title — the row's primary text. */
  name: string;
  /** The secondary line: "330 cal" or "4 exercises". */
  detail: string;
  date: Date;
}

/** How many rows Home shows. Five on both clients. */
export const RECENT_ACTIVITY_LIMIT = 5;

/** "1 exercise" / "4 exercises" — the web's own pluralisation, kept verbatim. */
export function exerciseCountLabel(count: number): string {
  return `${count} exercise${count !== 1 ? 's' : ''}`;
}

/**
 * The most recent `limit` items across both sources, newest first.
 *
 * Entries with an unparseable date sort last rather than throwing; a single bad row must
 * not blank the card.
 *
 * A BOUNDED SELECTION, not a sort. Both sources are whole-history reads on both clients
 * (`listAll()` paging on Expo, an unpaginated list on the web), so mapping every row into a
 * new object and sorting the lot would allocate thousands of objects and run an O(n log n)
 * sort to keep five rows — on Home, inside a `useMemo` that re-runs on every cache write,
 * which includes every food entry and workout the user logs. This walks each source once,
 * keeps only the best `limit` candidates, and builds display objects for those alone.
 */
export function buildRecentActivity(
  foodEntries: readonly RecentActivityFoodSource[],
  workouts: readonly RecentActivityWorkoutSource[],
  limit: number = RECENT_ACTIVITY_LIMIT
): RecentActivityItem[] {
  const cap = Math.max(0, limit);
  if (cap === 0) return [];

  /** A place in the running top-`cap`: which source, and which row of it. */
  interface Pick {
    time: number;
    isFood: boolean;
    index: number;
  }

  // Newest first. Nothing is allocated for a row that does not make the cut — that is the
  // whole point of scanning rather than mapping-then-sorting.
  const best: Pick[] = [];

  const offer = (time: number, isFood: boolean, index: number) => {
    // Pure short-circuit: a full list cannot be improved by something no newer than its
    // oldest member. The walk below would reach the same answer without this line, just
    // after a splice and a pop — so `<=` versus `<` here is speed, not behaviour.
    if (best.length === cap && time <= best[best.length - 1].time) return;
    // Walk back past everything older. Stopping on equality is what keeps this stable: a
    // tie never displaces the incumbent, so food (scanned first) stays ahead of a workout
    // logged at the same instant, exactly as a stable sort over [...food, ...workouts] did.
    let at = best.length;
    while (at > 0 && best[at - 1].time < time) at -= 1;
    best.splice(at, 0, { time, isFood, index });
    if (best.length > cap) best.pop();
  };

  for (let i = 0; i < foodEntries.length; i += 1) offer(sortableTime(foodEntries[i].date), true, i);
  for (let i = 0; i < workouts.length; i += 1) offer(sortableTime(workouts[i].date), false, i);

  return best.map((pick) => {
    if (pick.isFood) {
      const f = foodEntries[pick.index];
      return { id: f.id, type: 'food' as const, name: f.name, detail: `${f.calories} cal`, date: f.date };
    }
    const w = workouts[pick.index];
    return {
      id: w.id,
      type: 'workout' as const,
      name: w.title,
      detail: exerciseCountLabel(w.exercises.length),
      date: w.date,
    };
  });
}

/** `NaN` from an invalid Date would make every comparison false and leave the order arbitrary. */
function sortableTime(date: Date): number {
  const time = date instanceof Date ? date.getTime() : Number.NaN;
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}
