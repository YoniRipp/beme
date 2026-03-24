/**
 * WebSocket relay for real-time voice streaming via Gemini Live API.
 *
 * Browser --[WS: audio chunks]--> Backend --[WS: realtimeInput]--> Gemini Live API
 * Browser <--[WS: actions/results]-- Backend <--[WS: toolCall]-- Gemini Live API
 *
 * Each browser WebSocket gets its own Gemini Live session.
 * Falls back to batch mode if streaming is unavailable.
 */
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { HANDLERS, VOICE_PROMPT } from '../services/voice.js';
import { VOICE_TOOLS } from '../../voice/tools.js';
import { executeActions } from '../services/voiceExecutor.js';
import { logger } from '../lib/logger.js';

const INACTIVITY_TIMEOUT_MS = 30_000;

/** Extract and verify JWT from query string ?token=... */
async function authenticateWs(req: IncomingMessage): Promise<{ id: string; email: string; role: string } | null> {
  try {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token || !config.jwtSecret) return null;

    const payload = jwt.verify(token, config.jwtSecret) as { sub?: string; email?: string; role?: string };
    if (!payload.sub) return null;
    return { id: payload.sub, email: payload.email ?? '', role: payload.role ?? 'user' };
  } catch {
    return null;
  }
}

/** Check Pro subscription or free-tier quota. */
async function checkProOrQuota(userId: string): Promise<{ allowed: boolean; message?: string }> {
  const { tryConsumeAiCall } = await import('../services/aiQuota.js');
  try {
    const result = await tryConsumeAiCall(userId);
    if (result.allowed) return { allowed: true };
    return {
      allowed: false,
      message: "You've used all your free AI calls this month. Exciting updates coming soon!",
    };
  } catch {
    return { allowed: false, message: 'Could not verify subscription status' };
  }
}

/** Send JSON message to browser client. */
function sendToClient(ws: WebSocket, msg: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

/** Build Gemini Live API setup message. */
function buildSetupMessage(mimeType: string) {
  // Convert VOICE_TOOLS format to Gemini Live API format
  const toolDeclarations = VOICE_TOOLS[0]?.functionDeclarations ?? [];

  return {
    setup: {
      model: `models/${config.geminiLiveModel ?? 'gemini-2.0-flash-live-001'}`,
      generationConfig: {
        responseModalities: ['TEXT'],
      },
      systemInstruction: {
        parts: [{ text: VOICE_PROMPT }],
      },
      tools: [{ functionDeclarations: toolDeclarations }],
    },
  };
}

/** Handle a single browser WebSocket connection. */
async function handleConnection(clientWs: WebSocket, req: IncomingMessage) {
  // 1. Authenticate
  const maybeUser = await authenticateWs(req);
  if (!maybeUser) {
    sendToClient(clientWs, { type: 'error', message: 'Authentication required' });
    clientWs.close(4001, 'Unauthorized');
    return;
  }
  const user = maybeUser;

  // 2. Check Pro / free-tier quota
  const quota = await checkProOrQuota(user.id);
  if (!quota.allowed) {
    sendToClient(clientWs, { type: 'error', message: quota.message ?? 'Access denied' });
    clientWs.close(4003, 'Forbidden');
    return;
  }

  // 3. Check Gemini API key
  if (!config.geminiApiKey) {
    sendToClient(clientWs, { type: 'error', message: 'Voice service not configured' });
    clientWs.close(4500, 'Not configured');
    return;
  }

  let geminiWs: WebSocket | null = null;
  let sessionReady = false;
  let sessionMetadata: { today: string; timezone: string; mimeType: string } | null = null;
  let allActions: Record<string, unknown>[] = [];
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

  function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      logger.info({ userId: user.id }, 'Voice stream: inactivity timeout');
      cleanup();
    }, INACTIVITY_TIMEOUT_MS);
  }

  function cleanup() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (geminiWs && geminiWs.readyState !== WebSocket.CLOSED) {
      geminiWs.close();
    }
    if (clientWs.readyState !== WebSocket.CLOSED) {
      clientWs.close();
    }
  }

  /** Open WebSocket to Gemini Live API and set up handlers. */
  function connectToGemini() {
    const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${config.geminiApiKey}`;
    const liveModel = config.geminiLiveModel ?? 'gemini-2.0-flash-live-001';

    logger.info({ userId: user.id, model: liveModel }, 'Voice stream: connecting to Gemini');

    geminiWs = new WebSocket(geminiUrl);

    // Timeout: if setupComplete doesn't arrive in 10s, abort
    const setupTimer = setTimeout(() => {
      if (!sessionReady) {
        logger.error({ userId: user.id, model: liveModel }, 'Voice stream: Gemini setup timed out (10s)');
        sendToClient(clientWs, { type: 'error', message: 'Voice streaming setup timed out' });
        cleanup();
      }
    }, 10_000);

    geminiWs.on('open', () => {
      logger.info({ userId: user.id }, 'Voice stream: Gemini WS open, sending setup');
      const setup = buildSetupMessage(sessionMetadata?.mimeType ?? 'audio/webm');
      geminiWs!.send(JSON.stringify(setup));
    });

    geminiWs.on('message', async (data: RawData) => {
      try {
        const msg = JSON.parse(data.toString());

        // Setup complete
        if (msg.setupComplete) {
          clearTimeout(setupTimer);
          sessionReady = true;
          logger.info({ userId: user.id }, 'Voice stream: Gemini setup complete');
          sendToClient(clientWs, { type: 'ready' });
          return;
        }

        // Tool calls from Gemini
        if (msg.toolCall) {
          const functionCalls = msg.toolCall.functionCalls ?? [];
          const ctx = {
            todayStr: sessionMetadata?.today ?? new Date().toISOString().slice(0, 10),
            timezone: sessionMetadata?.timezone,
          };

          for (const fc of functionCalls) {
            const handler = HANDLERS[fc.name];
            if (!handler) {
              logger.warn({ name: fc.name }, 'Voice stream: unknown function');
              continue;
            }

            const action: Record<string, unknown> = { intent: fc.name };
            const result = await handler(fc.args ?? {}, ctx);
            if (result.merge) Object.assign(action, result.merge);
            allActions.push(action);

            // Stream action to client immediately
            sendToClient(clientWs, { type: 'action', action });
          }

          // Send tool response back to Gemini (acknowledge)
          const functionResponses = functionCalls.map((fc: { name: string; args?: Record<string, unknown> }) => ({
            id: fc.name,
            name: fc.name,
            response: { result: 'ok' },
          }));
          if (geminiWs?.readyState === WebSocket.OPEN) {
            geminiWs.send(JSON.stringify({ toolResponse: { functionResponses } }));
          }

          return;
        }

        // Server content with turn complete — Gemini is done
        if (msg.serverContent?.turnComplete) {
          await finishSession();
          return;
        }

        // Transcript/text from Gemini (model generated text)
        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            if (part.text) {
              sendToClient(clientWs, { type: 'transcript', text: part.text });
            }
          }
        }
      } catch (err) {
        logger.error({ err }, 'Voice stream: error processing Gemini message');
      }
    });

    geminiWs.on('error', (err) => {
      clearTimeout(setupTimer);
      logger.error({ err, userId: user.id }, 'Voice stream: Gemini WS error');
      sendToClient(clientWs, { type: 'error', message: 'Voice streaming connection failed' });
      cleanup();
    });

    geminiWs.on('close', (code, reason) => {
      clearTimeout(setupTimer);
      logger.info({ userId: user.id, code, reason: reason?.toString() }, 'Voice stream: Gemini WS closed');
      if (clientWs.readyState === WebSocket.OPEN) {
        if (allActions.length > 0) {
          finishSession().catch(() => {});
        } else if (!sessionReady) {
          // Gemini closed before setup completed — surface the error
          sendToClient(clientWs, { type: 'error', message: 'Voice streaming connection closed before ready' });
          cleanup();
        } else {
          // Session was ready but no actions collected — send done with unknown
          finishSession().catch(() => {});
        }
      }
    });
  }

  /** Execute actions server-side and send final 'done' message. */
  async function finishSession() {
    // Filter out likely-hallucinated actions from background noise.
    // A workout with no exercises and a very short/generic title is suspicious.
    allActions = allActions.filter((a) => {
      if (a.intent === 'add_workout') {
        const exercises = Array.isArray(a.exercises) ? a.exercises : [];
        const title = String(a.title ?? '').trim();
        // If no exercises and title is default or very short, treat as hallucination
        if (exercises.length === 0 && (title === 'Workout' || title.length <= 3)) {
          logger.info({ userId: user.id, title }, 'Voice stream: filtered likely-hallucinated workout');
          return false;
        }
      }
      return true;
    });

    if (allActions.length === 0) {
      allActions.push({ intent: 'unknown' });
    }

    let results;
    if (config.voiceExecuteOnServer) {
      try {
        results = await executeActions(
          allActions as { intent: string; [key: string]: unknown }[],
          user.id,
        );
      } catch (err) {
        logger.error({ err }, 'Voice stream: execute actions failed');
      }
    }

    sendToClient(clientWs, { type: 'done', actions: allActions, results });
    cleanup();
  }

  // Handle messages from browser client
  clientWs.on('message', (data: RawData, isBinary: boolean) => {
    resetInactivityTimer();

    if (isBinary) {
      // Binary frame = raw audio chunk, relay to Gemini
      if (geminiWs?.readyState === WebSocket.OPEN && sessionReady) {
        const audioBytes = Buffer.from(data as Buffer);
        const base64 = audioBytes.toString('base64');
        geminiWs.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              mimeType: sessionMetadata?.mimeType ?? 'audio/webm',
              data: base64,
            }],
          },
        }));
      }
      return;
    }

    // Text frame = JSON control message
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'start') {
        sessionMetadata = {
          today: msg.today ?? new Date().toISOString().slice(0, 10),
          timezone: msg.timezone ?? '',
          mimeType: msg.mimeType ?? 'audio/webm',
        };
        allActions = [];
        connectToGemini();
        resetInactivityTimer();
        return;
      }

      if (msg.type === 'stop') {
        // Signal end of audio to Gemini
        if (geminiWs?.readyState === WebSocket.OPEN) {
          geminiWs.send(JSON.stringify({
            realtimeInput: { audioStreamEnd: true },
          }));
        }
        return;
      }
    } catch {
      logger.warn('Voice stream: invalid JSON from client');
    }
  });

  clientWs.on('close', () => {
    cleanup();
  });

  clientWs.on('error', (err) => {
    logger.error({ err }, 'Voice stream: client WS error');
    cleanup();
  });

  resetInactivityTimer();
}

/**
 * Set up the voice streaming WebSocket server.
 * Attach to an existing HTTP server via WebSocketServer.
 */
export function setupVoiceStreamingWs(wss: WebSocketServer) {
  wss.on('connection', (ws, req) => {
    handleConnection(ws, req).catch((err) => {
      logger.error({ err }, 'Voice stream: connection handler error');
      sendToClient(ws, { type: 'error', message: 'Internal server error' });
      ws.close(4500, 'Internal error');
    });
  });

  logger.info('Voice streaming WebSocket ready at /ws/voice-stream');
}
