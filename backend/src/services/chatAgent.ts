/**
 * Chat Agent service — AI assistant that can both converse AND execute actions.
 * Uses Gemini function calling with multi-turn support for complex commands like
 * "move my workout from today to yesterday" or "copy today's meals for the week".
 */
import { getGeminiModel } from './voice/geminiClient.js';
import { AGENT_TOOLS } from '../../voice/agentTools.js';
import { HANDLERS } from './voice/actionBuilders.js';
import { executeActions, type ExecuteResult } from './voiceExecutor.js';
import { buildChatSystemPrompt, saveChatMessage, getChatHistory } from './chat.js';
import * as workoutService from './workout.js';
import * as foodEntryService from './foodEntry.js';
import * as goalService from './goal.js';
import * as weightModel from '../models/weight.js';
import * as waterModel from '../models/water.js';
import { logger } from '../lib/logger.js';

const MAX_TOOL_ROUNDS = 5;

// ─── Read tool execution ─────────────────────────────────────────────────────

async function executeReadTool(name: string, args: Record<string, unknown>, userId: string): Promise<unknown> {
  const todayStr = new Date().toISOString().slice(0, 10);

  switch (name) {
    case 'get_workouts': {
      const result = await workoutService.list(userId);
      const workouts = result.data;
      if (args.date) {
        const dateStr = String(args.date);
        return workouts.filter((w: { date: string | Date }) => String(w.date).startsWith(dateStr));
      }
      return workouts.slice(0, 20);
    }
    case 'get_food_entries': {
      const result = await foodEntryService.list(userId);
      const entries = result.data;
      if (args.date) {
        const dateStr = String(args.date);
        return entries.filter((e: { date: string | Date }) => String(e.date).startsWith(dateStr));
      }
      return entries.slice(0, 30);
    }
    case 'get_goals': {
      const result = await goalService.list(userId);
      return result.data;
    }
    case 'get_weight_entries': {
      const startDate = args.startDate as string | undefined;
      const endDate = args.endDate as string | undefined;
      return await weightModel.findByUserId(userId, startDate, endDate);
    }
    case 'get_water_today': {
      const date = (args.date as string) || todayStr;
      const entry = await waterModel.findByUserAndDate(userId, date);
      return entry ?? { glasses: 0, mlTotal: 0, date };
    }
    case 'copy_food_entries': {
      const fromDate = String(args.fromDate);
      const toDates = args.toDates as string[];
      const result = await foodEntryService.list(userId);
      const sourceEntries = result.data.filter((e: { date: string | Date }) => String(e.date).startsWith(fromDate));
      if (sourceEntries.length === 0) {
        return { copied: 0, error: `No food entries found for ${fromDate}` };
      }
      let totalCopied = 0;
      for (const toDate of toDates) {
        for (const entry of sourceEntries) {
          await foodEntryService.create(userId, {
            date: toDate,
            name: entry.name,
            calories: entry.calories,
            protein: entry.protein,
            carbs: entry.carbs,
            fats: entry.fats,
            portionAmount: entry.portionAmount,
            portionUnit: entry.portionUnit,
          });
          totalCopied++;
        }
      }
      return { copied: totalCopied, fromDate, toDates, entriesPerDay: sourceEntries.length };
    }
    case 'copy_workout': {
      const fromDate = String(args.fromDate);
      const toDate = String(args.toDate);
      const result = await workoutService.list(userId);
      const sourceWorkouts = result.data.filter((w: { date: string | Date; title: string }) => {
        const matches = String(w.date).startsWith(fromDate);
        if (args.workoutTitle) return matches && w.title.toLowerCase().includes(String(args.workoutTitle).toLowerCase());
        return matches;
      });
      if (sourceWorkouts.length === 0) {
        return { copied: 0, error: `No workouts found for ${fromDate}` };
      }
      for (const w of sourceWorkouts) {
        await workoutService.create(userId, {
          date: toDate,
          title: w.title,
          type: w.type,
          durationMinutes: w.durationMinutes,
          exercises: w.exercises,
          notes: w.notes,
        });
      }
      return { copied: sourceWorkouts.length, fromDate, toDate };
    }
    default:
      return { error: `Unknown read tool: ${name}` };
  }
}

// ─── Agent message processing ─────────────────────────────────────────────────

export async function sendAgentMessage(
  userId: string,
  userMessage: string,
): Promise<{ text: string; actions: ExecuteResult[] }> {
  await saveChatMessage(userId, 'user', userMessage);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [systemPrompt, history] = await Promise.all([
    buildChatSystemPrompt(userId),
    getChatHistory(userId, 20),
  ]);

  const agentSystemPrompt = `${systemPrompt}

═══ AGENT CAPABILITIES ═══
You are an AI fitness assistant that can both answer questions AND take actions.
- When the user asks you to DO something (move a workout, copy meals, log food, etc.), use the available tools.
- When you need data to answer a question or complete a task, fetch it first using get_* tools.
- For multi-step tasks (e.g. "copy my meals for the rest of the week"), execute all needed actions.
- Always confirm what you did after completing actions. Be specific about what changed.
- Today's date: ${todayStr}`;

  const model = getGeminiModel();
  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: 'System instructions:\n' + agentSystemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I can answer questions and take actions on your behalf. How can I help?' }] },
      ...history.slice(0, -1).map((msg) => ({
        role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: msg.content }],
      })),
    ],
    tools: AGENT_TOOLS as never,
  });

  const executedActions: ExecuteResult[] = [];
  let responseText = '';

  try {
    let lastResult = await chat.sendMessage(userMessage);
    let response = lastResult.response;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const functionCalls = response.functionCalls?.() ?? [];
      if (functionCalls.length === 0) {
        responseText = response.text?.() ?? '';
        break;
      }

      const functionResponses: Array<{ functionResponse: { name: string; response: { result: string } } }> = [];

      for (const fc of functionCalls) {
        const isReadOrCopy = fc.name.startsWith('get_') || fc.name.startsWith('copy_');
        let result: unknown;

        if (isReadOrCopy) {
          result = await executeReadTool(fc.name, (fc.args || {}) as Record<string, unknown>, userId);
        } else {
          // Write action — use actionBuilders + voiceExecutor
          const handler = HANDLERS[fc.name];
          if (handler) {
            const ctx = { todayStr };
            const built = await handler((fc.args || {}) as Record<string, unknown>, ctx);
            const action = { intent: fc.name, ...(built.merge || {}) };
            const execResults = await executeActions([action as { intent: string; [key: string]: unknown }], userId);
            result = execResults[0];
            executedActions.push(execResults[0]);
          } else {
            result = { success: false, message: `Unknown action: ${fc.name}` };
          }
        }

        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: { result: JSON.stringify(result) },
          },
        });
      }

      // Feed results back to Gemini
      lastResult = await chat.sendMessage(functionResponses as never);
      response = lastResult.response;
    }

    if (!responseText) {
      responseText = response?.text?.() ?? 'Done.';
    }
  } catch (err) {
    logger.error({ err }, 'Agent chat error');
    responseText = 'I encountered an issue processing your request. Please try again.';
  }

  await saveChatMessage(userId, 'assistant', responseText);
  return { text: responseText, actions: executedActions };
}
