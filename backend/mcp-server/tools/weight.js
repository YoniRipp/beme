import { z } from 'zod';

export function register(server, api) {
  server.tool(
    'list_weight_entries',
    'List weight log entries. Returns body weight measurements over time with dates and optional notes.',
    {
      // `.default()` rather than `.optional()`, and unconditional below. These are the only two
      // endpoints whose controller uses `parseOptionalPagination`, which returns undefined when
      // the caller sends neither bound -- and the model then gets no LIMIT clause and the user's
      // whole table. Every other list tool here hits a controller with `paginationSchema`, which
      // defaults to 50 server-side, so they stay `.optional()` on purpose.
      limit: z.number().int().min(1).max(200).default(30).describe('Max number of entries to return (default 30)'),
      offset: z.number().int().min(0).optional().describe('Number of entries to skip for pagination'),
    },
    async ({ limit, offset }) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (offset !== undefined) params.set('offset', String(offset));
      const result = await api.get(`/api/weight-entries?${params}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'add_weight_entry',
    'Log a body weight measurement. Records the user\'s weight for a specific date.',
    {
      date: z.string().describe('Date in YYYY-MM-DD format'),
      weight: z.number().min(10).max(500).describe('Body weight value (10-500)'),
      notes: z.string().optional().describe('Optional notes about the measurement'),
    },
    async (args) => {
      const result = await api.post('/api/weight-entries', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'delete_weight_entry',
    'Delete a weight entry by ID. Permanently removes the weight measurement.',
    {
      id: z.string().describe('ID of the weight entry to delete'),
    },
    async ({ id }) => {
      const result = await api.delete(`/api/weight-entries/${id}`);
      if (result === null) {
        return { content: [{ type: 'text', text: 'Deleted successfully.' }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
