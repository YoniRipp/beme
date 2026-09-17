/**
 * Lemon Squeezy webhook route: signature verification.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import request from 'supertest';
import express from 'express';
import http from 'http';
import net from 'net';
import type { AddressInfo } from 'net';

vi.mock('../config/index.js', () => ({
  config: {
    // Inlined rather than shared with WEBHOOK_SECRET below: this factory is hoisted above
    // the module's consts.
    lemonSqueezyApiKey: 'test-api-key',
    lemonSqueezyWebhookSecret: 'test-webhook-secret',
    frontendOrigin: 'http://localhost:5173',
  },
}));

const mockHandleWebhookEvent = vi.fn();
vi.mock('../services/subscription.js', () => ({
  createCheckoutSession: vi.fn(),
  getCustomerPortalUrl: vi.fn(),
  getUserSubscription: vi.fn(),
  handleWebhookEvent: (...args: unknown[]) => mockHandleWebhookEvent(...args),
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'user@test.com', role: 'user' };
    next();
  },
}));

const mockLoggerError = vi.fn();
vi.mock('../lib/logger.js', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { createWebhookRouter } from './subscription.js';

/** Mirrors the config mock above. */
const WEBHOOK_SECRET = 'test-webhook-secret';

const BODY = JSON.stringify({ meta: { event_name: 'subscription_created' } });

/** What the x-signature header looked like by the time it reached the webhook handler. */
let seenSignature: string | undefined;

/** What express.raw() left on req.body by the time it reached the webhook handler. */
let seenBody: unknown;

/** Mirrors app.ts: express.raw() on this path, mounted before express.json(). */
function buildApp() {
  const app = express();
  app.use('/api/webhooks/lemonsqueezy', express.raw({ type: 'application/json' }));
  app.use((req, _res, next) => {
    seenSignature = req.headers['x-signature'] as string | undefined;
    seenBody = req.body;
    next();
  });
  app.use(createWebhookRouter());
  return app;
}

function post(signature: string) {
  return request(buildApp())
    .post('/api/webhooks/lemonsqueezy')
    .set('Content-Type', 'application/json')
    .set('x-signature', signature)
    .send(BODY);
}

/**
 * Sends the exact bytes of an HTTP/1.1 request over a real socket and returns what came back.
 *
 * Not supertest: superagent re-encodes header values and sets a Content-Type of its own as soon
 * as anything reaches .send(), so it cannot express "no Content-Type and no body at all" -- one
 * of the two requests that crash this handler. These are the bytes the wire produces, with
 * nothing between them and the server.
 *
 * `response` is null when nothing came back before the timeout, which is the bug's real
 * observable: the handler throws before `res` is ever touched, so the client just hangs.
 * `unhandled` collects the unhandledRejection reasons raised while the request was in flight --
 * index.ts turns each of those into process.exit(1).
 */
async function rawRequest(requestBytes: string, timeoutMs = 3000) {
  const server = http.createServer(buildApp());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const { port } = server.address() as AddressInfo;

  const unhandled: unknown[] = [];
  const onUnhandledRejection = (reason: unknown) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    const raw = await new Promise<string | null>((resolve, reject) => {
      const socket = net.connect(port, '127.0.0.1');
      let received = '';
      const timer = setTimeout(() => { socket.destroy(); resolve(null); }, timeoutMs);
      socket.on('connect', () => socket.write(requestBytes));
      socket.on('data', (chunk: Buffer) => { received += chunk.toString('utf8'); });
      socket.on('close', () => { clearTimeout(timer); resolve(received || null); });
      socket.on('error', (err) => { clearTimeout(timer); reject(err); });
    });
    // Let a rejection the handler already scheduled reach the listener before we read it.
    await new Promise((resolve) => setImmediate(resolve));
    if (raw === null) return { response: null, unhandled };
    const [head, ...rest] = raw.split('\r\n\r\n');
    return {
      response: { status: Number(head.split('\r\n')[0].split(' ')[1]), body: rest.join('\r\n\r\n') },
      unhandled,
    };
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('POST /api/webhooks/lemonsqueezy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seenSignature = undefined;
    seenBody = undefined;
    mockHandleWebhookEvent.mockResolvedValue(undefined);
  });

  it('accepts a correctly signed payload', async () => {
    const digest = crypto.createHmac('sha256', WEBHOOK_SECRET).update(Buffer.from(BODY)).digest('hex');

    const res = await post(digest);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(mockHandleWebhookEvent).toHaveBeenCalledWith({ meta: { event_name: 'subscription_created' } });
  });

  it('rejects a wrong signature of the same length as the digest', async () => {
    const res = await post('a'.repeat(64));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid signature' });
    expect(mockLoggerError).toHaveBeenCalledWith('Lemon Squeezy webhook signature verification failed');
    expect(mockHandleWebhookEvent).not.toHaveBeenCalled();
  });

  it('rejects a signature carrying a byte >= 0x80 without killing the process', async () => {
    // Node decodes header values as latin1, so one multi-byte character on the wire arrives
    // as two characters here: the header reaches the handler as 64 UTF-16 code units but 66
    // UTF-8 bytes. String#length calls that the same size as the 64-char hex digest, so the
    // length gate lets it through; timingSafeEqual compares bytes and throws RangeError.
    // That throw is at the top of an async Express 4 handler with no try/catch, so it becomes
    // an unhandled rejection and index.ts exits the process -- on an unauthenticated request.
    const res = await post('é' + 'a'.repeat(62));

    // The attack only exists while the header lands as exactly digest-length characters with
    // a byte >= 0x80. Assert that here so a change in how supertest encodes headers fails
    // loudly instead of letting this test quietly stop reproducing anything.
    expect(seenSignature).toHaveLength(64);
    expect(Buffer.from(seenSignature!, 'utf8')).toHaveLength(66);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid signature' });
    expect(mockLoggerError).toHaveBeenCalledWith('Lemon Squeezy webhook signature verification failed');
    expect(mockHandleWebhookEvent).not.toHaveBeenCalled();
  });

  // express.raw() assigns `req.body = req.body || {}` BEFORE its content-type check, so any
  // request that does not look like application/json reaches the handler with a plain object
  // where the Buffer should be. hmac.update({}) throws TypeError synchronously at the top of an
  // async Express 4 handler -> unhandled rejection -> index.ts process.exit(1), with no response
  // ever written. Unauthenticated, and mounted above apiLimiter (app.ts:85 vs app.ts:182).
  describe('when express.raw() left a non-Buffer body', () => {
    it('rejects a non-JSON content type instead of taking the process down', async () => {
      const { response, unhandled } = await rawRequest(
        'POST /api/webhooks/lemonsqueezy HTTP/1.1\r\n' +
        'Host: 127.0.0.1\r\n' +
        `x-signature: ${'a'.repeat(64)}\r\n` +
        'Content-Type: text/plain\r\n' +
        'Content-Length: 5\r\n' +
        'Connection: close\r\n' +
        '\r\n' +
        'hello',
      );

      // The precondition the crash needs. If body-parser ever stops handing over a plain
      // object here, this fails loudly rather than passing while reproducing nothing.
      expect(Buffer.isBuffer(seenBody)).toBe(false);
      expect(seenBody).toEqual({});

      expect(unhandled).toEqual([]);
      expect(response).not.toBeNull();
      expect(response!.status).toBe(400);
      expect(JSON.parse(response!.body)).toEqual({ error: 'Invalid JSON body' });
      expect(mockHandleWebhookEvent).not.toHaveBeenCalled();
    });

    it('rejects a request with no content type and no body at all', async () => {
      const { response, unhandled } = await rawRequest(
        'POST /api/webhooks/lemonsqueezy HTTP/1.1\r\n' +
        'Host: 127.0.0.1\r\n' +
        `x-signature: ${'a'.repeat(64)}\r\n` +
        'Connection: close\r\n' +
        '\r\n',
      );

      expect(Buffer.isBuffer(seenBody)).toBe(false);
      expect(seenBody).toEqual({});

      expect(unhandled).toEqual([]);
      expect(response).not.toBeNull();
      expect(response!.status).toBe(400);
      expect(JSON.parse(response!.body)).toEqual({ error: 'Invalid JSON body' });
      expect(mockHandleWebhookEvent).not.toHaveBeenCalled();
    });
  });
});
