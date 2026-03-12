/**
 * Agent tool declarations — extends voice tools with read/copy operations for multi-step reasoning.
 */
import { VOICE_TOOLS } from './tools.js';

const READ_TOOLS = [
  {
    name: 'get_workouts',
    description: 'Fetch the user\'s workouts. Optionally filter by date.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD to filter by specific date' },
      },
    },
  },
  {
    name: 'get_food_entries',
    description: 'Fetch the user\'s food entries. Optionally filter by date.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD to filter' },
      },
    },
  },
  {
    name: 'get_goals',
    description: 'Fetch all the user\'s goals.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_weight_entries',
    description: 'Fetch weight entries.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string' },
        endDate: { type: 'string' },
      },
    },
  },
  {
    name: 'get_water_today',
    description: 'Get today\'s water intake.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
      },
    },
  },
  {
    name: 'copy_food_entries',
    description: 'Copy all food entries from one date to another date (or multiple dates). Use for "copy today\'s meals to tomorrow" or "repeat this meal plan for the week".',
    parameters: {
      type: 'object',
      properties: {
        fromDate: { type: 'string', description: 'Source date YYYY-MM-DD' },
        toDates: { type: 'array', items: { type: 'string' }, description: 'Target dates YYYY-MM-DD array' },
      },
      required: ['fromDate', 'toDates'],
    },
  },
  {
    name: 'copy_workout',
    description: 'Copy a workout from one date to another. Use for "move my workout to yesterday" or "copy Monday\'s workout to Wednesday".',
    parameters: {
      type: 'object',
      properties: {
        fromDate: { type: 'string', description: 'Source date YYYY-MM-DD' },
        toDate: { type: 'string', description: 'Target date YYYY-MM-DD' },
        workoutTitle: { type: 'string', description: 'Optional: specific workout to copy by title' },
      },
      required: ['fromDate', 'toDate'],
    },
  },
];

// Merge voice tools with read tools
const voiceDeclarations = VOICE_TOOLS[0].functionDeclarations;

export const AGENT_TOOLS = [
  {
    functionDeclarations: [...voiceDeclarations, ...READ_TOOLS],
  },
];
