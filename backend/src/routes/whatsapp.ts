/**
 * WhatsApp webhook routes.
 * GET  /api/whatsapp/webhook — Meta verification challenge
 * POST /api/whatsapp/webhook — Incoming messages from WhatsApp
 */
import crypto from 'crypto';
import { Router } from 'express';
import { config } from '../config/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendJson, sendError } from '../utils/response.js';
import { handleWebhook, type WhatsAppWebhookPayload } from '../services/whatsapp.js';
import { logger } from '../lib/logger.js';
import type { Request, Response } from 'express';

const router = Router();

/**
 * Constant-time string comparison.
 *
 * Sizes the buffers by their BYTE lengths, not String#length: String#length counts UTF-16 code
 * units and Node decodes header values as latin1, so two values of equal character count can be
 * a different number of bytes -- crypto.timingSafeEqual then throws. Same guard as the Lemon
 * Squeezy webhook in routes/subscription.ts.
 */
function timingSafeEquals(a: string, b: string): boolean {
  const aBytes = Buffer.from(a, 'utf8');
  const bBytes = Buffer.from(b, 'utf8');
  return aBytes.length === bBytes.length && crypto.timingSafeEqual(aBytes, bBytes);
}

/**
 * GET /api/whatsapp/webhook
 * Meta sends a GET request to verify the webhook URL during setup.
 * Must respond with the hub.challenge value when the verify token matches.
 */
router.get('/api/whatsapp/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && typeof token === 'string' &&
      timingSafeEquals(token, config.whatsappVerifyToken ?? '')) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  // The supplied token is a guess at a secret -- never log it back out.
  logger.warn({ mode }, 'WhatsApp webhook verification failed');
  return res.status(403).send('Forbidden');
});

/**
 * POST /api/whatsapp/webhook
 * Receives incoming messages from WhatsApp via Meta Cloud API.
 * Verifies Meta's X-Hub-Signature-256 HMAC before doing anything with the payload, then
 * returns 200 quickly to acknowledge receipt.
 *
 * The HMAC is over the bytes Meta sent, so this path needs `express.raw({ type:
 * 'application/json' })` mounted BEFORE `express.json()` in app.ts -- exactly as
 * /api/webhooks/lemonsqueezy already is. A re-serialised object cannot reproduce the signature.
 */
router.post('/api/whatsapp/webhook', asyncHandler(async (req: Request, res: Response) => {
  // Fail closed. handleWebhook() walks attacker-controlled arrays into the Gemini pipeline and
  // replies with sendWhatsAppMessage(msg.from, ...) -- our access token, our phone number id, a
  // recipient the caller chose. Without the app secret there is no way to tell Meta's traffic
  // from anyone else's, so an unconfigured webhook must refuse rather than process.
  // 503, not 403: the request is not forbidden, the server is unable to service it. Same code
  // and message shape as the Lemon Squeezy webhook with no secret configured (subscription.ts).
  if (!config.whatsappAppSecret) {
    logger.error('WhatsApp webhook rejected: WHATSAPP_APP_SECRET is not configured');
    return sendError(res, 503, 'WhatsApp webhooks not configured', { code: 'SERVICE_UNAVAILABLE' });
  }

  const signature = req.headers['x-hub-signature-256'];
  if (typeof signature !== 'string') {
    return sendError(res, 400, 'Missing signature', { code: 'VALIDATION_ERROR' });
  }

  // express.raw() runs `req.body = req.body || {}` BEFORE it checks the content type, so a
  // request whose Content-Type is not application/json -- or absent -- reaches here with a plain
  // object rather than a Buffer; so does every request if app.ts has not mounted express.raw()
  // on this path yet. hmac.update({}) would throw TypeError synchronously at the top of this
  // async handler. Treat a body that never arrived as the unverifiable body it is.
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    logger.error('WhatsApp webhook rejected: raw request body unavailable');
    return sendError(res, 400, 'Invalid JSON body', { code: 'VALIDATION_ERROR' });
  }

  const digest = 'sha256=' + crypto
    .createHmac('sha256', config.whatsappAppSecret)
    .update(rawBody)
    .digest('hex');

  if (!timingSafeEquals(signature, digest)) {
    logger.error('WhatsApp webhook signature verification failed');
    return sendError(res, 400, 'Invalid signature', { code: 'VALIDATION_ERROR' });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf8')) as WhatsAppWebhookPayload;
  } catch {
    return sendError(res, 400, 'Invalid JSON body', { code: 'VALIDATION_ERROR' });
  }

  // Always respond 200 immediately to Meta (they retry on non-200)
  res.status(200).send('OK');

  // Process asynchronously
  handleWebhook(payload).catch(err => {
    logger.error({ err }, 'WhatsApp webhook processing error');
  });
}));

/**
 * GET /api/whatsapp/status
 * Health check for WhatsApp integration.
 */
router.get('/api/whatsapp/status', (_req: Request, res: Response) => {
  const configured = !!(config.whatsappAccessToken && config.whatsappPhoneNumberId);
  sendJson(res, {
    configured,
    phoneNumberId: configured ? config.whatsappPhoneNumberId : undefined,
  });
});

export default router;
