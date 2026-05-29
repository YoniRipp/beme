import { z } from 'zod';

export function register(server, api) {
  server.tool(
    'get_streaks',
    "Get the user's current streaks. Returns streak types with current and longest streak counts.",
    z.object({}),
    async () => {
      const result = await api.get('/api/streaks');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
