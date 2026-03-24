/**
 * Shared Gemini client -- model initialization and response processing.
 */
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import { HANDLERS } from './actionBuilders.js';

export function getGeminiModel() {
  if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];
  return genAI.getGenerativeModel({ model: config.geminiModel, safetySettings });
}

interface GeminiResponse {
  functionCalls?: () => Array<{ name: string; args?: Record<string, unknown> }>;
}

interface BuildContext {
  todayStr: string;
  timezone?: string;
}

/**
 * Process a Gemini response containing function calls into action objects.
 */
export async function processGeminiResponse(response: GeminiResponse, ctx: BuildContext): Promise<{ actions: Record<string, unknown>[] }> {
  const functionCalls = response.functionCalls?.() ?? [];
  const actions: Record<string, unknown>[] = [];

  for (const fc of functionCalls) {
    const handler = HANDLERS[fc.name];
    if (!handler) {
      logger.warn({ name: fc.name }, 'Voice: unknown function');
      actions.push({ intent: 'unknown', message: `Action "${fc.name}" is not supported` });
      continue;
    }

    const action: Record<string, unknown> = { intent: fc.name };
    const result = await handler(fc.args || {}, ctx);
    if (result.merge) Object.assign(action, result.merge);
    if (result.items?.length) (action as { items?: unknown[] }).items = result.items;

    const isEmptyItems = result.items && result.items.length === 0;
    if (!isEmptyItems) actions.push(action);
  }

  // Filter out likely-hallucinated actions (e.g. add_workout from background noise).
  // A workout with no exercises and a very short or default title is suspicious.
  const filtered = actions.filter((a) => {
    if (a.intent === 'add_workout') {
      const exercises = Array.isArray(a.exercises) ? a.exercises : [];
      const title = String(a.title ?? '').trim();
      if (exercises.length === 0 && (title === 'Workout' || title.length <= 3)) {
        logger.info({ title }, 'Voice: filtered likely-hallucinated workout');
        return false;
      }
    }
    return true;
  });

  if (filtered.length === 0) {
    filtered.push({ intent: 'unknown' });
  }

  return { actions: filtered };
}
