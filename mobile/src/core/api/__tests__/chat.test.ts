import { ApiError } from '@trackvibe/shared/api';
import {
  CHAT_HISTORY_LIMIT,
  MAX_CHAT_MESSAGE_LENGTH,
  QUOTA_EXHAUSTED_MESSAGE,
  chatApi,
  chatErrorMessage,
  isQuotaExhausted,
} from '../chat';

const mockRequest = jest.fn();
jest.mock('../client', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
  // Re-exported by the real module from the shared transport; the tests below construct
  // real `ApiError`s, so the mock has to hand back the same class or `instanceof` fails.
  ApiError: jest.requireActual('@trackvibe/shared/api').ApiError,
}));

beforeEach(() => {
  mockRequest.mockReset();
  mockRequest.mockResolvedValue(undefined);
});

describe('chatApi', () => {
  it('asks for the same amount of backlog the web does, within the server clamp of 1..100', () => {
    void chatApi.getHistory();

    expect(CHAT_HISTORY_LIMIT).toBe(50);
    expect(mockRequest).toHaveBeenCalledWith('/api/chat/history?limit=50');
  });

  it('lets a caller narrow the history read', () => {
    void chatApi.getHistory(10);

    expect(mockRequest).toHaveBeenCalledWith('/api/chat/history?limit=10');
  });

  /**
   * The transport's default is 30s, and the handler runs up to five Gemini round trips with
   * function calling in between (`MAX_TOOL_ROUNDS` in `backend/src/services/chat.ts`). A
   * timeout here does not refund the AI call `requireAiQuota` already debited, so the
   * override is what stops a working turn costing a call and showing nothing.
   */
  it('gives a turn the 60s the agent loop needs, not the transport default', () => {
    void chatApi.send('how many workouts this week?');

    expect(mockRequest).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      body: { message: 'how many workouts this week?' },
      timeoutMs: 60_000,
    });
  });

  it('clears history with the DELETE the route actually exposes', () => {
    void chatApi.clearHistory();

    expect(mockRequest).toHaveBeenCalledWith('/api/chat/history', { method: 'DELETE' });
  });

  it('caps a message where the controller does, so an over-long one is not a spent call', () => {
    // `backend/src/controllers/chat.ts` rejects >2000 with a 400 — but `requireAiQuota`
    // runs before the handler, so that 400 is debited.
    expect(MAX_CHAT_MESSAGE_LENGTH).toBe(2000);
  });
});

/**
 * `requireAiQuota` refuses with `{ error: 'free_quota_exhausted', message, remainingCalls }`
 * — a bare string in `error`, which the shared transport unwraps as THE MESSAGE. So the
 * human sentence one key over never reaches the client, and relaying `ApiError.message`
 * verbatim (what `lib/errorMessage.ts` does everywhere else) puts the machine code on
 * screen.
 */
describe('quota refusals', () => {
  const quotaError = new ApiError('free_quota_exhausted', 403);

  it('recognises the refusal the transport has flattened to its code', () => {
    expect(isQuotaExhausted(quotaError)).toBe(true);
  });

  it('shows the sentence the backend meant, never the code the transport handed over', () => {
    expect(chatErrorMessage(quotaError, 'fallback')).toBe(QUOTA_EXHAUSTED_MESSAGE);
    expect(chatErrorMessage(quotaError, 'fallback')).not.toMatch(/free_quota_exhausted/);
  });

  it('is not fooled by another 403, or by the same code at another status', () => {
    expect(isQuotaExhausted(new ApiError('Forbidden', 403))).toBe(false);
    expect(isQuotaExhausted(new ApiError('free_quota_exhausted', 500))).toBe(false);
    expect(isQuotaExhausted(new Error('free_quota_exhausted'))).toBe(false);
    expect(isQuotaExhausted(null)).toBe(false);
  });

  it('relays every other failure verbatim, including the one that names the missing key', () => {
    // The 503 uses the modern `{ error: { message } }` envelope, so it arrives readable.
    const notConfigured = new ApiError('AI chat not configured (missing GEMINI_API_KEY)', 503);

    expect(chatErrorMessage(notConfigured, 'fallback')).toBe(
      'AI chat not configured (missing GEMINI_API_KEY)',
    );
    expect(chatErrorMessage(new ApiError('Message too long (max 2000 characters)', 400), 'x')).toBe(
      'Message too long (max 2000 characters)',
    );
  });

  it('falls back when the failure carried no server message at all', () => {
    expect(chatErrorMessage(new Error('Request timed out'), 'Failed to send')).toBe('Failed to send');
    expect(chatErrorMessage(undefined, 'Failed to send')).toBe('Failed to send');
  });
});
