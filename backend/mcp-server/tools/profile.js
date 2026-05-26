import { z } from 'zod';

export function register(server, api) {
  server.tool(
    'get_profile',
    'Get the user profile. Returns personal info, body metrics, activity level, macro targets, and water goal.',
    z.object({}),
    async () => {
      const result = await api.get('/api/profile');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'update_profile',
    'Update user profile settings. Can update body metrics, activity level, macro targets, and water goal.',
    z.object({
      dateOfBirth: z.string().optional().describe('Date of birth (YYYY-MM-DD)'),
      sex: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().describe('Biological sex'),
      heightCm: z.number().optional().describe('Height in centimeters'),
      currentWeight: z.number().optional().describe('Current weight in kg'),
      targetWeight: z.number().optional().describe('Target weight in kg'),
      activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional().describe('Activity level'),
      waterGoalGlasses: z.number().optional().describe('Daily water goal in glasses'),
      setupCompleted: z.boolean().optional().describe('Whether initial setup is complete'),
      macroCarbs: z.number().optional().describe('Daily carb target in grams'),
      macroFat: z.number().optional().describe('Daily fat target in grams'),
      macroProtein: z.number().optional().describe('Daily protein target in grams'),
    }),
    async (args) => {
      const result = await api.put('/api/profile', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
