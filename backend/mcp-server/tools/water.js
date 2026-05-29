import { z } from 'zod';

export function register(server, api) {
  server.tool(
    'get_water_today',
    'Get today\'s water intake. Returns the number of glasses of water logged for the current day.',
    z.object({}),
    async () => {
      const result = await api.get('/api/water-entries');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_water_history',
    'Get water intake history across multiple days. Returns daily glass counts for past days.',
    z.object({
      limit: z.number().int().min(1).max(200).optional().describe('Max number of days to return'),
      offset: z.number().int().min(0).optional().describe('Number of days to skip for pagination'),
    }),
    async ({ limit, offset }) => {
      const params = new URLSearchParams();
      if (limit !== undefined) params.set('limit', String(limit));
      if (offset !== undefined) params.set('offset', String(offset));
      const qs = params.toString();
      const result = await api.get(`/api/water-entries/history${qs ? `?${qs}` : ''}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'add_water_glass',
    'Log one glass of water for a given date. Increments the daily water count by one.',
    z.object({
      date: z.string().describe('Date in YYYY-MM-DD format'),
    }),
    async (args) => {
      const result = await api.post('/api/water-entries/add-glass', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'remove_water_glass',
    'Remove one glass of water for a given date. Decrements the daily water count by one.',
    z.object({
      date: z.string().describe('Date in YYYY-MM-DD format'),
    }),
    async (args) => {
      const result = await api.post('/api/water-entries/remove-glass', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
