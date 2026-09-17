import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import type { IncomingMessage } from 'http';
import type { WebSocket, WebSocketServer } from 'ws';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

vi.mock('../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret',
    geminiApiKey: 'test-key',
    geminiLiveModel: 'gemini-test',
    voiceExecuteOnServer: false,
  },
}));

vi.mock('../lib/keyValueStore.js', () => ({
  kvGet: vi.fn().mockResolvedValue(null),
}));

vi.mock('../services/voice.js', () => ({ VOICE_PROMPT: 'prompt' }));
vi.mock('../services/voice/geminiClient.js', () => ({
  buildActionsFromFunctionCalls: vi.fn().mockResolvedValue([]),
  filterHallucinatedActions: vi.fn((actions: unknown[]) => actions),
}));
vi.mock('../../voice/tools.js', () => ({ VOICE_TOOLS: [{ functionDeclarations: [] }] }));
vi.mock('../services/voiceExecutor.js', () => ({ executeActions: vi.fn().mockResolvedValue([]) }));
vi.mock('../services/aiQuota.js', () => ({
  checkAiQuota: vi.fn().mockResolvedValue({ allowed: true }),
  tryConsumeAiCall: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const jwt = (await import('jsonwebtoken')).default;
const { kvGet } = await import('../lib/keyValueStore.js');
const { checkAiQuota } = await import('../services/aiQuota.js');
const { setupVoiceStreamingWs } = await import('./voiceStreaming.js');

const TOKEN = 'revoked.jwt.token';
const BLOCKLIST_KEY = 'blocked:' + crypto.createHash('sha256').update(TOKEN).digest('hex');

/** Minimal stand-in for the browser WebSocket: an emitter with the bits the handler touches. */
function makeClientWs() {
  const ws = new EventEmitter() as EventEmitter & {
    readyState: number;
    send: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  ws.readyState = 1; // WebSocket.OPEN
  ws.send = vi.fn();
  ws.close = vi.fn(() => {
    ws.readyState = 3; // WebSocket.CLOSED
  });
  return ws;
}

/** Drive one connection through the real wss handler and wait for it to settle. */
async function connect(clientWs: ReturnType<typeof makeClientWs>) {
  const wss = new EventEmitter();
  setupVoiceStreamingWs(wss as unknown as WebSocketServer);
  const req = { url: `/ws/voice-stream?token=${TOKEN}`, headers: { host: 'localhost' } } as unknown as IncomingMessage;
  wss.emit('connection', clientWs as unknown as WebSocket, req);
  // Let the async auth / quota chain resolve.
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

describe('voice streaming WebSocket auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (jwt.verify as any).mockReturnValue({ sub: 'user-1', email: 'u@example.com', role: 'user' });
    (kvGet as any).mockResolvedValue(null);
    (checkAiQuota as any).mockResolvedValue({ allowed: true });
  });

  it('rejects a token that is on the revocation blocklist', async () => {
    (kvGet as any).mockImplementation(async (key: string) => (key === BLOCKLIST_KEY ? '1' : null));

    const clientWs = makeClientWs();
    await connect(clientWs);

    expect(kvGet).toHaveBeenCalledWith(BLOCKLIST_KEY);
    expect(clientWs.close).toHaveBeenCalledWith(4001, 'Unauthorized');
    expect(clientWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'error', message: 'Authentication required' }),
    );
    // The session must be refused before any quota / Gemini work happens.
    expect(checkAiQuota).not.toHaveBeenCalled();
  });

  it('accepts a valid token that has not been revoked', async () => {
    const clientWs = makeClientWs();
    await connect(clientWs);

    expect(kvGet).toHaveBeenCalledWith(BLOCKLIST_KEY);
    expect(clientWs.close).not.toHaveBeenCalledWith(4001, 'Unauthorized');
    expect(checkAiQuota).toHaveBeenCalledWith('user-1');

    clientWs.emit('close'); // clear the inactivity timer
  });
});
