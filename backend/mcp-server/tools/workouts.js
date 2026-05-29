import { z } from 'zod';

export function register(server, api) {
  server.tool(
    'list_workouts',
    'List logged workouts. Returns workout sessions with title, type, duration, exercises, and completion status.',
    z.object({
      limit: z.number().int().min(1).max(200).optional().describe('Max number of workouts to return'),
      offset: z.number().int().min(0).optional().describe('Number of workouts to skip for pagination'),
    }),
    async ({ limit, offset }) => {
      const params = new URLSearchParams();
      if (limit !== undefined) params.set('limit', String(limit));
      if (offset !== undefined) params.set('offset', String(offset));
      const qs = params.toString();
      const result = await api.get(`/api/workouts${qs ? `?${qs}` : ''}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'add_workout',
    'Log a new workout session. Records the workout type, duration, exercises with sets/reps/weight, and optional notes.',
    z.object({
      date: z.string().describe('Date in YYYY-MM-DD format'),
      title: z.string().describe('Workout title (e.g. "Push Day", "Morning Run")'),
      type: z.enum(['strength', 'cardio', 'flexibility', 'sports']).describe('Type of workout'),
      durationMinutes: z.number().int().min(1).max(1440).describe('Duration in minutes'),
      exercises: z.array(
        z.object({
          name: z.string().describe('Exercise name'),
          sets: z.number().int().describe('Number of sets'),
          reps: z.number().int().describe('Number of reps per set'),
          weight: z.number().optional().describe('Weight used (in user preferred unit)'),
          notes: z.string().optional().describe('Notes for this exercise'),
        })
      ).optional().describe('List of exercises performed'),
      notes: z.string().optional().describe('General workout notes'),
      completed: z.boolean().optional().describe('Whether the workout was completed'),
    }),
    async (args) => {
      const result = await api.post('/api/workouts', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'update_workout',
    'Update an existing workout. Can modify title, type, duration, exercises, notes, or completion status.',
    z.object({
      id: z.string().describe('ID of the workout to update'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format'),
      title: z.string().optional().describe('Workout title'),
      type: z.enum(['strength', 'cardio', 'flexibility', 'sports']).optional().describe('Type of workout'),
      durationMinutes: z.number().int().min(1).max(1440).optional().describe('Duration in minutes'),
      exercises: z.array(
        z.object({
          name: z.string().describe('Exercise name'),
          sets: z.number().int().describe('Number of sets'),
          reps: z.number().int().describe('Number of reps per set'),
          weight: z.number().optional().describe('Weight used'),
          notes: z.string().optional().describe('Notes for this exercise'),
        })
      ).optional().describe('List of exercises performed'),
      notes: z.string().optional().describe('General workout notes'),
      completed: z.boolean().optional().describe('Whether the workout was completed'),
    }),
    async ({ id, ...fields }) => {
      const result = await api.patch(`/api/workouts/${id}`, fields);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'delete_workout',
    'Delete a workout by ID. Permanently removes the workout session and its exercises.',
    z.object({
      id: z.string().describe('ID of the workout to delete'),
    }),
    async ({ id }) => {
      const result = await api.delete(`/api/workouts/${id}`);
      if (result === null) {
        return { content: [{ type: 'text', text: 'Deleted successfully.' }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
