import { z } from 'zod';

/**
 * Read-only analytics/ops tools. Gated behind MCP_OPS_MODE so they are never
 * exposed in normal operation. They wrap the existing admin endpoints, which
 * require an admin role — so the impersonated MCP user must be an admin.
 *
 * All tools use api.raw() (non-throwing): a 403/401 comes back as data so the
 * agent can report "not authorized" instead of crashing.
 */

function text(t) {
  return { content: [{ type: 'text', text: typeof t === 'string' ? t : JSON.stringify(t, null, 2) }] };
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function register(server, api) {
  server.tool(
    'ops_business_overview',
    'Aggregated business stats for the whole app: total users, new users this week, weekly active users, subscription breakdown (pro/monthly/yearly/trainer-granted/churned), trainer and trainee counts, active trainer-client links, and voice usage. The primary source for Users, Retention, and Trainer questions.',
    z.object({}),
    async () => text(await api.raw('GET', '/api/admin/stats'))
  );

  server.tool(
    'ops_runtime_metrics',
    'Runtime metrics: per-endpoint HTTP request counts and latency (p50/p95/p99), DB query stats, error counts, cache hit rate, event throughput, Gemini call counts. Use endpoint request counts to answer "which features/endpoints are used vs. unused".',
    z.object({}),
    async () => text(await api.raw('GET', '/api/admin/metrics'))
  );

  server.tool(
    'ops_error_logs',
    'Recent application ERROR logs (most recent ~200). Use for the bugs/reliability domain — what is failing server-side and how often.',
    z.object({}),
    async () => text(await api.raw('GET', '/api/admin/logs?level=error'))
  );

  server.tool(
    'ops_action_logs',
    'Recent application ACTION logs (notable non-error events, most recent ~200).',
    z.object({}),
    async () => text(await api.raw('GET', '/api/admin/logs?level=action'))
  );

  server.tool(
    'ops_activity',
    'User activity event feed over a time window (workouts, food, check-ins, goals, voice, logins). Group by event_type to gauge feature adoption. Window is capped at 90 days.',
    z.object({
      days: z.number().min(1).max(90).optional().describe('Look-back window in days (default 7)'),
      eventType: z.string().optional().describe("Filter to one event type, e.g. 'voice.VoiceUnderstand' or prefix like 'energy.'"),
      limit: z.number().min(1).max(100).optional().describe('Max events to return (default 50)'),
    }),
    async ({ days, eventType, limit }) => {
      const params = new URLSearchParams({
        from: isoDaysAgo(days ?? 7),
        to: new Date().toISOString(),
      });
      if (eventType) params.set('eventType', eventType);
      if (limit !== undefined) params.set('limit', String(limit));
      return text(await api.raw('GET', `/api/admin/activity?${params.toString()}`));
    }
  );

  server.tool(
    'ops_search_users',
    'Search users by email or name (admin). Returns id, email, name, role, createdAt. Use to resolve a specific user the admin asks about.',
    z.object({
      q: z.string().describe('Email or name fragment to search for'),
      limit: z.number().min(1).max(100).optional().describe('Max results (default 20)'),
    }),
    async ({ q, limit }) => {
      const params = new URLSearchParams({ q });
      if (limit !== undefined) params.set('limit', String(limit));
      return text(await api.raw('GET', `/api/admin/users/search?${params.toString()}`));
    }
  );
}
