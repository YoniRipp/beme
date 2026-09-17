/**
 * WhatsApp webhook route: X-Hub-Signature-256 verification, fail-closed behaviour, and the
 * GET challenge.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import request from 'supertest';
import express from 'express';

vi.mock('../config/index.js', () => ({
  // Inlined rather than shared with the consts below: this factory is hoisted above them.
  config: {
    whatsappAccessToken: 'test-access-token',
    whatsappPhoneNumberId: 'test-phone-id',
    whatsappVerifyToken: 'test-verify-token',
    whatsappAppSecret: 'test-app-secret',
  },
}));

const mockHandleWebhook = vi.fn().mockResolvedValue(undefined);
vi.mock('../services/whatsapp.js', () => ({
  handleWebhook: (...args: unknown[]) => mockHandleWebhook(...args),
}));

const mockLoggerWarn = vi.fn();
const mockLoggerError = vi.fn();
vi.mock('../lib/logger.js', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../lib/metrics.js', () => ({
  recordError: vi.fn(),
  metricsMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { config } from '../config/index.js';
import whatsappRouter from './whatsapp.js';

/** The mocked config object is mutable, so a test can take a key away and put it back. */
const mutableConfig = config as unknown as Record<string, unknown>;

/** Mirrors the config mock above. */
const APP_SECRET = 'test-app-secret';
const VERIFY_TOKEN = 'test-verify-token';

const BODY = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [{ id: '1', changes: [{ field: 'messages', value: { messages: [] } }] }],
});

function sign(body: string, secret = APP_SECRET) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(Buffer.from(body, 'utf8')).digest('hex');
}

/** What the x-hub-signature-256 header looked like by the time it reached the handler. */
let seenSignature: string | undefined;

/** Mirrors app.ts WITH the express.raw() mount this route needs (see the report). */
function buildApp() {
  const app = express();
  app.use('/api/whatsapp/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '10mb' }));
  app.use((req, _res, next) => {
    seenSignature = req.headers['x-hub-signature-256'] as string | undefined;
    next();
  });
  app.use(whatsappRouter);
  return app;
}

/** app.ts WITHOUT the raw mount, i.e. what this route looked like before app.ts:89. */
function buildAppWithoutRawBody() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(whatsappRouter);
  return app;
}

function post(app: express.Express, body: string, signature?: string) {
  const req = request(app).post('/api/whatsapp/webhook').set('Content-Type', 'application/json');
  if (signature !== undefined) req.set('x-hub-signature-256', signature);
  return req.send(body);
}

beforeEach(() => {
  vi.clearAllMocks();
  seenSignature = undefined;
  mockHandleWebhook.mockResolvedValue(undefined);
  mutableConfig.whatsappAppSecret = APP_SECRET;
  mutableConfig.whatsappVerifyToken = VERIFY_TOKEN;
});

afterEach(() => {
  mutableConfig.whatsappAppSecret = APP_SECRET;
  mutableConfig.whatsappVerifyToken = VERIFY_TOKEN;
});

describe('POST /api/whatsapp/webhook — signature verification', () => {
  it('accepts a correctly signed payload and processes it', async () => {
    const res = await post(buildApp(), BODY, sign(BODY));

    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
    expect(mockHandleWebhook).toHaveBeenCalledTimes(1);
    expect(mockHandleWebhook).toHaveBeenCalledWith(JSON.parse(BODY));
  });

  it('rejects a payload signed with the wrong secret and never processes it', async () => {
    const res = await post(buildApp(), BODY, sign(BODY, 'attacker-secret'));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockHandleWebhook).not.toHaveBeenCalled();
  });

  it('rejects a body that was tampered with after signing', async () => {
    const signature = sign(BODY);
    const tampered = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{
        id: '1',
        changes: [{
          field: 'messages',
          value: { messages: [{ id: 'm1', from: '972500000000', type: 'text', text: { body: 'hi' } }] },
        }],
      }],
    });

    const res = await post(buildApp(), tampered, signature);

    expect(res.status).toBe(400);
    expect(mockHandleWebhook).not.toHaveBeenCalled();
  });

  it('rejects an unsigned payload', async () => {
    const res = await post(buildApp(), BODY);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Missing signature');
    expect(mockHandleWebhook).not.toHaveBeenCalled();
  });

  it('rejects a signature carrying a byte >= 0x80 without throwing out of the handler', async () => {
    // Node decodes header values as latin1, so the one multi-byte character sent here arrives
    // as two: the header reaches the handler as 71 UTF-16 code units -- exactly the character
    // count of `sha256=` + 64 hex digits -- but 73 UTF-8 bytes. String#length calls that the
    // same size as the digest, so a length gate written that way lets it through and
    // crypto.timingSafeEqual then throws RangeError. Same shape as the Lemon Squeezy case in
    // subscription.test.ts.
    const res = await post(buildApp(), BODY, 'sha256=' + 'é' + 'a'.repeat(62));

    // The precondition the bug needs. Asserted so that a change in how supertest encodes
    // headers fails loudly instead of letting this test quietly stop reproducing anything.
    expect(seenSignature).toHaveLength(sign(BODY).length);
    expect(Buffer.from(seenSignature!, 'utf8').length).not.toBe(Buffer.from(sign(BODY), 'utf8').length);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid signature');
    expect(mockHandleWebhook).not.toHaveBeenCalled();
  });
});

describe('POST /api/whatsapp/webhook — fail closed', () => {
  it('refuses with 503 when WHATSAPP_APP_SECRET is not configured, even for a well-formed payload', async () => {
    delete mutableConfig.whatsappAppSecret;

    const res = await post(buildApp(), BODY, sign(BODY));

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(mockHandleWebhook).not.toHaveBeenCalled();
  });

  it('refuses when the raw body is unavailable (express.raw not mounted on this path)', async () => {
    // Kept as the negative of the wiring guard below: this is what the endpoint does if the
    // app.ts mount is ever removed -- refuse, rather than fall back to trusting the payload.
    const res = await post(buildAppWithoutRawBody(), BODY, sign(BODY));

    expect(res.status).toBe(400);
    expect(mockHandleWebhook).not.toHaveBeenCalled();
  });

  it('refuses a non-JSON content type, which express.raw leaves as a plain object', async () => {
    const res = await request(buildApp())
      .post('/api/whatsapp/webhook')
      .set('Content-Type', 'text/plain')
      .set('x-hub-signature-256', sign(BODY))
      .send(BODY);

    expect(res.status).toBe(400);
    expect(mockHandleWebhook).not.toHaveBeenCalled();
  });
});

describe('GET /api/whatsapp/webhook — verification challenge', () => {
  it('echoes the challenge when the verify token matches', async () => {
    const res = await request(buildApp())
      .get('/api/whatsapp/webhook')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': VERIFY_TOKEN, 'hub.challenge': '12345' });

    expect(res.status).toBe(200);
    expect(res.text).toBe('12345');
  });

  it('rejects a wrong verify token', async () => {
    const res = await request(buildApp())
      .get('/api/whatsapp/webhook')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong-token', 'hub.challenge': '12345' });

    expect(res.status).toBe(403);
  });

  it('does not log the supplied verify token', async () => {
    const supplied = 'guessed-secret-token-do-not-log';

    await request(buildApp())
      .get('/api/whatsapp/webhook')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': supplied, 'hub.challenge': '12345' });

    expect(mockLoggerWarn).toHaveBeenCalled();
    const logged = JSON.stringify(mockLoggerWarn.mock.calls);
    expect(logged).not.toContain(supplied);
  });

  it('does not throw when the verify token is supplied more than once', async () => {
    // qs turns a repeated key into an array; a bare Buffer.from(token) on it would throw.
    const res = await request(buildApp())
      .get('/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=a&hub.verify_token=b&hub.challenge=12345');

    expect(res.status).toBe(403);
  });
});

/**
 * The guard that actually matters. Every test above builds its own express app, so they all
 * pass whether or not the real app wires `express.raw` onto this path -- and if it does not,
 * the endpoint returns 400 to every genuine Meta delivery, Meta retries, and then disables
 * the subscription. This reads app.ts itself so removing that mount goes red here.
 */
describe('app.ts wiring', () => {
  it('mounts a raw body parser on the webhook path before express.json', async () => {
    const { readFileSync } = await import('fs');
    const appSource = readFileSync(new URL('../../app.ts', import.meta.url), 'utf8');

    const rawMount = appSource.indexOf("app.use('/api/whatsapp/webhook', express.raw(");
    const jsonMount = appSource.indexOf('app.use(express.json(');

    expect(rawMount).toBeGreaterThan(-1);
    expect(jsonMount).toBeGreaterThan(-1);
    // Order is the whole point: express.json() first would consume the stream and the handler
    // would never see a Buffer.
    expect(rawMount).toBeLessThan(jsonMount);
  });
});
