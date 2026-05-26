import { z } from 'zod';

export function register(server, api) {
  server.tool(
    'list_daily_checkins',
    'List daily check-ins. Returns check-in entries with sleep hours and dates.',
    z.object({
      limit: z.number().min(1).max(200).optional().describe('Max results to return'),
      offset: z.number().min(0).optional().describe('Number of results to skip'),
    }),
    async ({ limit, offset }) => {
      const params = new URLSearchParams();
      if (limit !== undefined) params.set('limit', String(limit));
      if (offset !== undefined) params.set('offset', String(offset));
      const qs = params.toString();
      const result = await api.get(`/api/daily-check-ins${qs ? `?${qs}` : ''}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'add_daily_checkin',
    'Log a daily check-in. Can include sleep hours.',
    z.object({
      date: z.string().describe('Date in YYYY-MM-DD format'),
      sleepHours: z.number().min(0).max(24).optional().describe('Hours of sleep'),
    }),
    async (args) => {
      const result = await api.post('/api/daily-check-ins', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'update_daily_checkin',
    'Update an existing daily check-in.',
    z.object({
      id: z.string().describe('Check-in ID'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format'),
      sleepHours: z.number().min(0).max(24).optional().describe('Hours of sleep'),
    }),
    async ({ id, ...body }) => {
      const result = await api.patch(`/api/daily-check-ins/${id}`, body);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
