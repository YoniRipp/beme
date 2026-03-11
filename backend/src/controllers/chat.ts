/**
 * AI Chat controller.
 * POST   /api/chat          — send a message, get AI coach response
 * GET    /api/chat/history   — get conversation history
 * DELETE /api/chat/history   — clear conversation history
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendJson, sendError } from '../utils/response.js';
import { sendMessage, getChatHistory, clearChatHistory } from '../services/chat.js';
import { config } from '../config/index.js';

export const chat = asyncHandler(async (req: Request, res: Response) => {
  if (!config.geminiApiKey) {
    return sendError(res, 503, 'AI chat not configured (missing GEMINI_API_KEY)');
  }
  const { message } = req.body ?? {};
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return sendError(res, 400, 'Message is required');
  }
  if (message.length > 2000) {
    return sendError(res, 400, 'Message too long (max 2000 characters)');
  }
  const response = await sendMessage(req.user!.id, message.trim());
  return sendJson(res, response);
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string, 10) || 30), 100);
  const messages = await getChatHistory(req.user!.id, limit);
  return sendJson(res, { messages });
});

export const deleteHistory = asyncHandler(async (req: Request, res: Response) => {
  await clearChatHistory(req.user!.id);
  return res.status(204).send();
});
