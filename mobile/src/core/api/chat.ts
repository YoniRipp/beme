import { ApiError, request } from './client';

/**
 * The AI coach slice — conversation history and one turn of chat.
 *
 * Transcribed from the routes as they are actually written (`backend/src/routes/chat.ts`
 * and `backend/src/controllers/chat.ts`), not from the web client's types, because the two
 * disagree and the web's are wrong. `frontend/src/core/api/chat.ts` types `POST /api/chat`
 * as `{ text, actions }`; the controller returns `sendJson(res, { ...reply, actions })`
 * where `reply` is the saved `chat_messages` row — so the real body is a `ChatMessage`
 * spread flat with `actions` alongside it, and there is no `text` field on it at all. The
 * web never noticed because `AiChatPanel` reads only `data.actions` and re-reads the turn
 * from `GET /api/chat/history`. Typing it correctly here costs nothing and stops the next
 * reader from reaching for `.text`.
 *
 * THREE OF THE SIX CHAT ROUTES ARE DELIBERATELY ABSENT.
 * - `POST /api/chat/agent/stream` is Server-Sent Events, read on the web with
 *   `res.body.getReader()`. React Native's `fetch` is XMLHttpRequest-backed and exposes no
 *   `ReadableStream` body, so that loop cannot be ported as written — a port needs
 *   `expo/fetch` or an XHR progress reader, which is a change of transport and its own
 *   decision. Nothing on the live web depends on it either: `ChatAgentPanel`, its only
 *   consumer, is not mounted anywhere (`grep -rn ChatAgentPanel frontend/src` finds only
 *   the file itself).
 * - `POST /api/chat/agent/confirm-plan` only ever receives a `PlanProposal`, and proposals
 *   are emitted exclusively by the stream endpoint. Without streaming there is nothing to
 *   confirm.
 * - `POST /api/chat/agent` is the non-streaming twin of the stream route and returns a
 *   different shape again (`{ text, actions }`, from `services/chatAgent.ts`). It has no
 *   consumer on either client and duplicates what `POST /api/chat` already does here,
 *   so adding it would be a name to keep in sync for nothing.
 *
 * Every call below is AI-gated (`requireAiQuota` on the send, `requireAiAccess` on the two
 * history routes) — see `chatErrorMessage` for the refusal this produces and why the
 * transport cannot unwrap it on its own.
 */

/**
 * A row of `chat_messages`, exactly as `getChatHistory` selects it
 * (`backend/src/services/chat.ts`). `created_at` is snake_case because the column is: this
 * controller sends the row through unmapped, unlike the camelCase DTOs elsewhere in this
 * client.
 */
export interface ApiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/**
 * One tool call the agent made during the turn — `ExecuteResult` in
 * `backend/src/services/voiceExecutor.ts`. `message` is optional there, so it is optional
 * here; a UI that renders it needs a fallback.
 */
export interface ChatAction {
  intent: string;
  success: boolean;
  message?: string;
}

/** `POST /api/chat` — the saved assistant row, spread, with the turn's tool calls beside it. */
export interface ChatSendResponse extends ApiChatMessage {
  actions: ChatAction[];
}

/** `GET /api/chat/history` — oldest first; the service reverses the `created_at DESC` read. */
export interface ChatHistoryResponse {
  messages: ApiChatMessage[];
}

/**
 * The controller rejects anything longer before it reaches a model
 * (`backend/src/controllers/chat.ts`), so the composer caps input at the same number
 * rather than letting the user write a 3000-character message and lose it to a 400.
 */
export const MAX_CHAT_MESSAGE_LENGTH = 2000;

/**
 * The server's own clamp on `?limit` is 1..100 with a default of 30. 50 is what the web
 * asks for (`AiChatPanel`), and asking for the same number keeps the two clients showing
 * the same amount of backlog.
 */
export const CHAT_HISTORY_LIMIT = 50;

/**
 * `requireAiQuota`'s refusal body is `{ error: 'free_quota_exhausted', message, remainingCalls }`
 * — a bare string in `error`, which is the OLD envelope. `errorMessageFrom` in the shared
 * transport unwraps that shape by design, so what reaches us as `ApiError.message` is the
 * machine code `'free_quota_exhausted'` and NOT the human sentence sitting one key over. Show
 * it to a user and they read "free_quota_exhausted".
 *
 * The middleware's own docblock calls the body "frozen on purpose" because the web client and
 * the MCP server both branch on this exact string, so this is a contract to match, not a
 * backend bug to fix here (critical rule 4).
 */
const QUOTA_EXHAUSTED_CODE = 'free_quota_exhausted';

/** The sentence the backend would have shown, copied from `quotaExhaustedBody()`. */
export const QUOTA_EXHAUSTED_MESSAGE =
  "You've used all your free AI calls this month. Exciting updates coming soon!";

/**
 * True when the AI monthly cap, not the request, is what failed.
 *
 * THIS IS A STATE TO DESIGN FOR, NOT AN EDGE CASE. `AI_MONTHLY_LIMIT` is unset in
 * production and `backend/src/config/index.ts` defaults it to **10** calls per calendar
 * month, shared across chat, voice, insights and food lookup — so an ordinary user reaches
 * it inside one sitting. (`docs/HANDOFF.md` says 100; the config and `backend/.env.example`
 * both say 10, and the code is what runs.)
 *
 * It is also not only the send that can hit it. `GET /api/chat/history` is behind
 * `requireAiAccess`, which spends nothing but still calls `checkAiQuota` and still returns
 * this same 403 when `remaining` is 0 — so an exhausted user cannot read the conversation
 * they already paid for either. The screen has to answer for both.
 */
export function isQuotaExhausted(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    error.message === QUOTA_EXHAUSTED_CODE
  );
}

/**
 * What to put on screen when a chat call fails.
 *
 * Deliberately not `messageFor` from `lib/errorMessage.ts`: that relays `ApiError.message`
 * verbatim, which is right everywhere else and wrong for exactly one response on these
 * routes — see `QUOTA_EXHAUSTED_CODE`. The 503 ("AI chat not configured (missing
 * GEMINI_API_KEY)") and the 400s use the modern `{ error: { message } }` envelope and come
 * through already readable, so they are relayed unchanged.
 */
export function chatErrorMessage(error: unknown, fallback: string): string {
  if (isQuotaExhausted(error)) return QUOTA_EXHAUSTED_MESSAGE;
  return error instanceof ApiError && error.message ? error.message : fallback;
}

export const chatApi = {
  getHistory: (limit: number = CHAT_HISTORY_LIMIT) =>
    request<ChatHistoryResponse>(`/api/chat/history?limit=${limit}`),

  /**
   * One turn. 60s rather than the transport's 30s default: the handler runs up to
   * `MAX_TOOL_ROUNDS` (5) Gemini round trips with function calling in between, and the web
   * passes the same 60s for the same reason.
   */
  send: (message: string) =>
    request<ChatSendResponse>('/api/chat', {
      method: 'POST',
      body: { message },
      timeoutMs: 60_000,
    }),

  /** 204, and it also drops the rolling `chat_summaries` row — history means all of it. */
  clearHistory: () => request<void>('/api/chat/history', { method: 'DELETE' }),
};
