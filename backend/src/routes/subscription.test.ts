/**
 * Lemon Squeezy webhook route: signature verification.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import request from 'supertest';
import express from 'express';

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

/** Mirrors app.ts: express.raw() on this path, mounted before express.json(). */
function buildApp() {
  const app = express();
  app.use('/api/webhooks/lemonsqueezy', express.raw({ type: 'application/json' }));
  app.use((req, _res, next) => {
    seenSignature = req.headers['x-signature'] as string | undefined;
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

describe('POST /api/webhooks/lemonsqueezy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seenSignature = undefined;
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
});
