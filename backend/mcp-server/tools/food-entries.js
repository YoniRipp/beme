import { z } from 'zod';

export function register(server, api) {
  server.tool(
    'list_food_entries',
    'List food entries. Returns food items logged by the user with calories, macros, portion info, and meal type.',
    z.object({
      limit: z.number().int().min(1).max(200).optional().describe('Max number of entries to return (1-200)'),
      offset: z.number().int().min(0).optional().describe('Number of entries to skip for pagination'),
    }),
    async ({ limit, offset }) => {
      const params = new URLSearchParams();
      if (limit !== undefined) params.set('limit', String(limit));
      if (offset !== undefined) params.set('offset', String(offset));
      const qs = params.toString();
      const result = await api.get(`/api/food-entries${qs ? `?${qs}` : ''}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'add_food_entry',
    'Log a new food entry with nutrition information. Records what the user ate including calories, macros, portion size, and which meal it belongs to.',
    z.object({
      date: z.string().describe('Date in YYYY-MM-DD format'),
      name: z.string().describe('Name of the food item'),
      calories: z.number().describe('Calorie count'),
      protein: z.number().optional().describe('Protein in grams'),
      carbs: z.number().optional().describe('Carbohydrates in grams'),
      fats: z.number().optional().describe('Fat in grams'),
      portionAmount: z.number().optional().describe('Portion amount (e.g. 200)'),
      portionUnit: z.string().optional().describe('Portion unit (e.g. "g", "ml", "oz")'),
      mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional().describe('Which meal this entry belongs to'),
    }),
    async (args) => {
      const result = await api.post('/api/food-entries', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'add_food_entries_batch',
    'Log multiple food entries at once. Useful when the user describes several foods in a single statement.',
    z.object({
      date: z.string().describe('Date in YYYY-MM-DD format'),
      entries: z.array(
        z.object({
          name: z.string().describe('Name of the food item'),
          calories: z.number().describe('Calorie count'),
          protein: z.number().optional().describe('Protein in grams'),
          carbs: z.number().optional().describe('Carbohydrates in grams'),
          fats: z.number().optional().describe('Fat in grams'),
          portionAmount: z.number().optional().describe('Portion amount'),
          portionUnit: z.string().optional().describe('Portion unit'),
          mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional().describe('Meal type'),
        })
      ).describe('Array of food entry objects to log'),
    }),
    async (args) => {
      const result = await api.post('/api/food-entries/batch', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'update_food_entry',
    'Update an existing food entry. Can modify any field such as name, calories, macros, portion, or meal type.',
    z.object({
      id: z.string().describe('ID of the food entry to update'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format'),
      name: z.string().optional().describe('Name of the food item'),
      calories: z.number().optional().describe('Calorie count'),
      protein: z.number().optional().describe('Protein in grams'),
      carbs: z.number().optional().describe('Carbohydrates in grams'),
      fats: z.number().optional().describe('Fat in grams'),
      portionAmount: z.number().optional().describe('Portion amount'),
      portionUnit: z.string().optional().describe('Portion unit'),
      mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional().describe('Meal type'),
    }),
    async ({ id, ...fields }) => {
      const result = await api.patch(`/api/food-entries/${id}`, fields);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'delete_food_entry',
    'Delete a food entry by ID. Permanently removes the logged food item.',
    z.object({
      id: z.string().describe('ID of the food entry to delete'),
    }),
    async ({ id }) => {
      const result = await api.delete(`/api/food-entries/${id}`);
      if (result === null) {
        return { content: [{ type: 'text', text: 'Deleted successfully.' }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'duplicate_food_day',
    'Copy all food entries from one day to another. Useful when the user ate the same meals as a previous day.',
    z.object({
      sourceDate: z.string().describe('Source date to copy from (YYYY-MM-DD)'),
      targetDate: z.string().describe('Target date to copy to (YYYY-MM-DD)'),
    }),
    async (args) => {
      const result = await api.post('/api/food-entries/duplicate-day', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
