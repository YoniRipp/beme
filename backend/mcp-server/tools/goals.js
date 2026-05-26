import { z } from 'zod';

export function register(server, api) {
  server.tool(
    'list_goals',
    'List all user goals. Returns fitness and health goals with their type, target value, and tracking period.',
    z.object({
      limit: z.number().int().min(1).max(200).optional().describe('Max number of goals to return'),
      offset: z.number().int().min(0).optional().describe('Number of goals to skip for pagination'),
    }),
    async ({ limit, offset }) => {
      const params = new URLSearchParams();
      if (limit !== undefined) params.set('limit', String(limit));
      if (offset !== undefined) params.set('offset', String(offset));
      const qs = params.toString();
      const result = await api.get(`/api/goals${qs ? `?${qs}` : ''}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'add_goal',
    'Create a new fitness or health goal. Supports calorie, workout, and sleep goals with configurable target and period.',
    z.object({
      type: z.enum(['calories', 'workouts', 'sleep']).describe('Goal category'),
      target: z.number().min(0).describe('Target value for the goal'),
      period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).describe('Tracking period for the goal'),
    }),
    async (args) => {
      const result = await api.post('/api/goals', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'update_goal',
    'Update an existing goal. Can modify the goal type, target value, or tracking period.',
    z.object({
      id: z.string().describe('ID of the goal to update'),
      type: z.enum(['calories', 'workouts', 'sleep']).optional().describe('Goal category'),
      target: z.number().min(0).optional().describe('Target value for the goal'),
      period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().describe('Tracking period'),
    }),
    async ({ id, ...fields }) => {
      const result = await api.patch(`/api/goals/${id}`, fields);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'delete_goal',
    'Delete a goal by ID. Permanently removes the fitness or health goal.',
    z.object({
      id: z.string().describe('ID of the goal to delete'),
    }),
    async ({ id }) => {
      const result = await api.delete(`/api/goals/${id}`);
      if (result === null) {
        return { content: [{ type: 'text', text: 'Deleted successfully.' }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
