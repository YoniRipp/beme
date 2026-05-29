import { z } from 'zod';

export function register(server, api) {
  server.tool(
    'search_exercises',
    'Search the exercise catalog by name or muscle group. Returns exercises with name, muscle group, category, and image/video URLs.',
    z.object({
      q: z.string().optional().describe('Search query for exercise name'),
      muscleGroup: z.string().optional().describe('Filter by muscle group (e.g. chest, back, legs)'),
    }),
    async ({ q, muscleGroup }) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (muscleGroup) params.set('muscleGroup', muscleGroup);
      const qs = params.toString();
      const result = await api.get(`/api/exercises${qs ? `?${qs}` : ''}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_exercise',
    'Get details for a specific exercise by ID. Returns name, muscle group, category, and media URLs.',
    z.object({
      id: z.string().describe('Exercise ID'),
    }),
    async ({ id }) => {
      const result = await api.get(`/api/exercises/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
