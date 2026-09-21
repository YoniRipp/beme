import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiInsightsApi, type InsightPeriod } from '../core/api/aiInsights';
import { queryKeys } from '../lib/queryKeys';
import { classifyAiFailure } from '../lib/aiInsightsState';

/**
 * The AI half of the Insights screen's server state.
 *
 * **Nothing here fetches on mount except the one free read.** That is the whole shape of this
 * hook, so it is the first thing it says.
 *
 * `GET /api/insights` and `GET /api/insights/today` sit behind `requireAiQuota`, which debits
 * one of the user's ten monthly AI calls in the middleware — before the handler runs, and
 * **including on a cache hit**, which `backend/src/routes/insights.ts:8-16` documents as a
 * known overcharge it cannot fix in isolation. A screen that fetched those on mount would
 * spend a user's entire month in ten visits to a tab, having generated nothing new on nine of
 * them. So both are `enabled` only once the user has asked, and the ask is a button.
 *
 * The web does fetch on mount, and worse: `AiInsightsSection.tsx` fires `getInsights(30)`,
 * prefetches the other three periods and calls `getTodayRecommendations` on every mount, then
 * auto-fires `POST /refresh` whenever `/freshness` says there is new activity. That is five
 * calls of ten per page load and six if the auto-refresh triggers, so the web exhausts a
 * month in two visits. This client does not mirror that, and that is a deliberate divergence
 * from parity rather than an omission — see the report on the PR.
 *
 * What each thing costs, so the trade-offs below can be checked rather than trusted:
 *
 * | trigger                      | requests                     | AI calls |
 * |------------------------------|------------------------------|----------|
 * | screen open                  | `/freshness`                 | **0**    |
 * | "Generate insights" pressed  | `/insights?days=N` + `/today`| 2        |
 * | period switched              | nothing                      | 0        |
 * | "Generate" on a new period   | `/insights?days=N`           | 1        |
 * | "Refresh" pressed            | `POST /refresh` + `/today`   | 2        |
 *
 * A period switch costs nothing because each period is its own cache entry and none of them
 * is `enabled` until asked for; coming back to a period already generated re-reads the cache.
 */

/**
 * How long a generated insight stays in the cache with nothing observing it.
 *
 * Matched to the backend's own `CACHE_FRESH_HOURS` (`services/insights.ts:250`): within 24
 * hours the server would hand back the very same row, and charge a call for it. React
 * Query's 5-minute default would have thrown the answer away between two visits to the tab
 * and made the user pay to be told the same thing.
 */
const AI_CACHE_TIME_MS = 24 * 60 * 60 * 1000;

/**
 * Options shared by the two reads that cost money.
 *
 * `staleTime: Infinity` is not "this never goes out of date" — it is "a timer is the wrong
 * thing to decide that". Whether an insight is out of date is a real question with a real,
 * free answer (`/freshness`, which compares the user's last activity to the last generation),
 * so the paid reads never expire on their own and the free one drives the stale notice.
 *
 * `retry: false` overrides `lib/queryClient.ts`'s client-wide single retry. The default is
 * right everywhere else and wrong here: the debit happens in middleware before the handler,
 * so a handler that 500s has already been paid for and the retry pays again. The three
 * failures that actually happen — 403, 503, a Gemini error — are none of them fixed by
 * asking twice.
 */
const PAID_READ_OPTIONS = {
  staleTime: Infinity,
  gcTime: AI_CACHE_TIME_MS,
  retry: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
} as const;

export function useAiInsights(periodDays: InsightPeriod) {
  const queryClient = useQueryClient();

  /**
   * Which period the user has explicitly asked for, if any.
   *
   * A period rather than a boolean, so that switching the selector does not carry the
   * permission with it: asking for 7 days is not asking for 90. It resets on unmount, which
   * is the conservative direction — a returning user re-reads the cache for free and only
   * spends again by pressing the button again.
   */
  const [requestedPeriod, setRequestedPeriod] = useState<InsightPeriod | null>(null);
  /**
   * Today's recommendations are not period-scoped (the handler ignores `days` and always
   * asks `getOrGenerateInsights` for its default), so once asked for they stay asked for.
   */
  const [todayRequested, setTodayRequested] = useState(false);

  const insightsQuery = useQuery({
    queryKey: queryKeys.aiInsights(periodDays),
    queryFn: () => aiInsightsApi.getInsights(periodDays),
    enabled: requestedPeriod === periodDays,
    ...PAID_READ_OPTIONS,
  });

  const todayQuery = useQuery({
    queryKey: queryKeys.aiToday,
    queryFn: () => aiInsightsApi.getTodayRecommendations(),
    enabled: todayRequested,
    ...PAID_READ_OPTIONS,
  });

  /**
   * The free read, and the only one that runs unasked.
   *
   * `requireAiAccess` -> `checkAiQuota` is a single SELECT that debits nothing
   * (`services/aiQuota.ts:94`), so this is safe to run on every screen open, and the retry
   * ban above does not apply — it keeps the client-wide default. One minute of `staleTime`
   * matches the web.
   */
  const freshnessQuery = useQuery({
    queryKey: queryKeys.aiFreshness,
    queryFn: () => aiInsightsApi.getFreshness(),
    staleTime: 60 * 1000,
  });

  const refreshMutation = useMutation({
    mutationFn: () => aiInsightsApi.refreshInsights(periodDays),
    retry: false,
    onSuccess: (fresh) => {
      // `setQueryData` rather than `invalidateQueries` (`data-fetching.md`), and here it is
      // not only about avoiding a spinner: the POST already returned the new narrative, so
      // invalidating would spend a second call to fetch what is in hand.
      queryClient.setQueryData(queryKeys.aiInsights(periodDays), fresh);
      setRequestedPeriod(periodDays);
      /**
       * The other three periods were regenerated server-side too (`refreshAllPeriods`), so
       * whatever this client has cached for them is now behind. They are removed rather than
       * invalidated: an invalidated query with an active observer refetches, and each of
       * those refetches is another call. Removed, they simply go back to asking.
       */
      queryClient.removeQueries({
        queryKey: queryKeys.aiInsightsAll,
        predicate: (query) => query.queryKey[1] !== periodDays,
      });
      // Today's recommendations were regenerated as part of the same row. This refetches (one
      // call) only if the user had asked for them; if they never did, `enabled` is false and
      // the invalidation just marks them stale for whenever they do.
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiToday });
      // Free, and now wrong: the row this compares against was just rewritten.
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiFreshness });
    },
  });

  const generate = useCallback(() => {
    setRequestedPeriod(periodDays);
    setTodayRequested(true);
  }, [periodDays]);

  const refresh = useCallback(() => {
    refreshMutation.mutate();
  }, [refreshMutation]);

  const freshness = freshnessQuery.data;
  const insights = insightsQuery.data;

  /**
   * Whether asking again could produce anything different.
   *
   * `/freshness` answers that for free, so a "Refresh" that the server would answer from the
   * same row is disabled rather than fired and silently short-circuited. The web makes the
   * button look live and then `return`s out of the handler, which is the same decision
   * presented as a broken button.
   *
   * When `/freshness` itself has not answered (or failed), the benefit of the doubt goes to
   * the user: `freshness == null` leaves the button live.
   */
  const canRefresh =
    !refreshMutation.isPending &&
    !insightsQuery.isFetching &&
    (freshness == null || freshness.needsRefresh);

  return {
    insights,
    insightsLoading: insightsQuery.isFetching,
    insightsFailure: classifyAiFailure(insightsQuery.error),

    today: todayQuery.data,
    todayLoading: todayQuery.isFetching,
    todayFailure: classifyAiFailure(todayQuery.error),

    freshness,
    isStale: freshness?.needsRefresh === true,
    /**
     * A failure on the FREE endpoint. A 403 here means the allowance is already gone, which
     * the screen can say before offering a button that would spend a call to discover it.
     */
    entitlementFailure: classifyAiFailure(freshnessQuery.error),

    /** Something to draw: either just asked for, or still in the cache from earlier. */
    hasContent: insights !== undefined,
    requesting: requestedPeriod === periodDays,
    generate,
    refresh,
    refreshing: refreshMutation.isPending,
    refreshFailure: classifyAiFailure(refreshMutation.error),
    canRefresh,
  };
}
