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
 */
export function buildRecentActivity(
  foodEntries: readonly RecentActivityFoodSource[],
  workouts: readonly RecentActivityWorkoutSource[],
  limit: number = RECENT_ACTIVITY_LIMIT
): RecentActivityItem[] {
  const items: RecentActivityItem[] = [
    ...foodEntries.map((f) => ({
      id: f.id,
      type: 'food' as const,
      name: f.name,
      detail: `${f.calories} cal`,
      date: f.date,
    })),
    ...workouts.map((w) => ({
      id: w.id,
      type: 'workout' as const,
      name: w.title,
      detail: exerciseCountLabel(w.exercises.length),
      date: w.date,
    })),
  ];

  return items
    .sort((a, b) => sortableTime(b.date) - sortableTime(a.date))
    .slice(0, Math.max(0, limit));
}

/** `NaN` from an invalid Date would make every comparison false and leave the sort arbitrary. */
function sortableTime(date: Date): number {
  const time = date instanceof Date ? date.getTime() : Number.NaN;
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}
