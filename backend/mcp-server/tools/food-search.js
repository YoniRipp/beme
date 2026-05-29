import { z } from 'zod';

export function register(server, api) {
  server.tool(
    'search_foods',
    'Search the food database by name. Returns matching foods with calorie and macro information.',
    z.object({
      q: z.string().describe('Search query for food name'),
      limit: z.number().min(1).max(50).optional().describe('Max results to return'),
    }),
    async ({ q, limit }) => {
      const params = new URLSearchParams({ q });
      if (limit !== undefined) params.set('limit', String(limit));
      const result = await api.get(`/api/food/search?${params.toString()}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'lookup_food_barcode',
    'Look up a food item by its barcode. Returns nutrition information for the scanned product.',
    z.object({
      code: z.string().describe('Barcode string'),
    }),
    async ({ code }) => {
      const result = await api.get(`/api/food/barcode/${code}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
