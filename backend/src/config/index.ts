/**
 * Application configuration. Loads env and exports config object.
 * Validated at startup with Zod.
 */

import dotenv from 'dotenv';
import { logger } from '../lib/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../..');

// Load .env first, then mode-specific file (.env.development or .env.production)
dotenv.config({ path: path.join(backendRoot, '.env') });
const mode = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.join(backendRoot, `.env.${mode}`) });

const isProduction = process.env.NODE_ENV === 'production';

const SESSION_TTL_DEFAULT_DAYS = 365;
const SESSION_TTL_DEFAULT_MS = SESSION_TTL_DEFAULT_DAYS * 24 * 60 * 60 * 1000;
const SESSION_TTL_DAYS = process.env.SESSION_TTL_DAYS;

/**
 * Zod would reject a bad value as `sessionTtlMs: expected number, received nan` -- a field
 * name that appears nowhere in the operator's env file. Fail by the name they actually set.
 */
function resolveSessionTtlMs(): number {
  if (!SESSION_TTL_DAYS) return SESSION_TTL_DEFAULT_MS;
  const days = Number(SESSION_TTL_DAYS);
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error(
      `SESSION_TTL_DAYS must be a positive number of days, got "${SESSION_TTL_DAYS}"`
    );
  }
  return days * 24 * 60 * 60 * 1000;
}

const configSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535),
  host: z.string().optional(),
  isProduction: z.boolean(),
  dbUrl: z.string().optional(),
  isDbConfigured: z.boolean(),
  geminiApiKey: z.string().optional(),
  geminiModel: z.string().default('gemini-2.5-flash'),
  jwtSecret: z.string().nullable().refine((v) => !isProduction || (v != null && v.length > 0), {
    message: 'JWT_SECRET must be set in production',
  }),
  // How long a login lasts. One value drives both the JWT `exp` claim and the token
  // cookie's maxAge -- when they disagree the shorter one silently wins and users get
  // logged out early. Long by design: the session rolls forward on every app open
  // (POST /api/auth/refresh), so an active user never sees the login screen again.
  sessionTtlMs: z.coerce.number().int().min(60 * 1000).default(SESSION_TTL_DEFAULT_MS),
  // AI calls allowed per user per calendar month. The product is free and has no paid tier,
  // so this is not a paywall -- it is the ceiling on Gemini spend a single account can cause.
  // Env-tunable so the number can be changed without a code deploy.
  aiMonthlyLimit: z.coerce.number().int().min(1).default(100),
  // CORS_ORIGIN is one origin or a comma-separated list, so the parser below yields a string
  // or a string[]. `.min(1)` rather than `.nonempty()` on the array -- same runtime check,
  // without widening the exported type with a `[string, ...string[]]` tuple no caller wants.
  //
  // Every message here names CORS_ORIGIN. A bare union reports `Invalid input`, which names
  // neither the field nor the env var the operator actually typed -- the message that made
  // this bug unreadable in the first place. The union `errorMap` covers a value that matches
  // no member at all; the per-check messages cover the ones Zod reports through its "dirty"
  // path, where a failed `.min()` inside a member is surfaced directly and the union's
  // errorMap never runs.
  corsOrigin: isProduction
    ? z.union(
        [
          z.string().min(1, 'CORS_ORIGIN must be set to an explicit origin in production'),
          z
            .array(z.string().min(1, 'CORS_ORIGIN must not contain an empty origin'))
            .min(1, 'CORS_ORIGIN must list at least one origin'),
        ],
        { errorMap: () => ({ message: 'CORS_ORIGIN must be set to an explicit origin in production' }) },
      )
    : z.union([z.string(), z.array(z.string()), z.boolean(), z.undefined()], {
        errorMap: () => ({
          message: 'CORS_ORIGIN must be an origin, a comma-separated list of origins, or unset',
        }),
      }),
  frontendOrigin: isProduction
    ? z.string().min(1, 'FRONTEND_ORIGIN must be set in production')
    : z.string().optional(),
  googleClientId: z.string().optional(),
  facebookAppId: z.string().optional(),
  facebookAppSecret: z.string().optional(),
  twitterClientId: z.string().optional(),
  twitterClientSecret: z.string().optional(),
  twitterRedirectUri: z.string().optional(),
  mcpSecret: z.string().optional(),
  mcpUserId: z.string().optional(),
  appBaseUrl: z.string().optional(),
  resendApiKey: z.string().optional(),
  resendFrom: z.string().optional(),
  redisUrl: z.string().optional(),
  isRedisConfigured: z.boolean(),
  eventTransport: z.enum(['redis', 'sqs']).optional(),
  awsRegion: z.string().optional(),
  awsS3Bucket: z.string().optional(),
  eventQueueUrl: z.string().url().optional(),
  voiceQueueUrl: z.string().url().optional(),
  bodyDbUrl: z.string().optional(),
  energyDbUrl: z.string().optional(),
  goalsDbUrl: z.string().optional(),
  bodyServiceUrl: z.string().url().optional(),
  energyServiceUrl: z.string().url().optional(),
  goalsServiceUrl: z.string().url().optional(),
  separateWorkers: z.boolean().optional(),
  voiceExecuteOnServer: z.boolean().optional(),
  voiceStreaming: z.boolean().optional(),
  geminiLiveModel: z.string().optional(),
  skipSchemaInit: z.boolean().optional(),
  lemonSqueezyApiKey: z.string().optional(),
  lemonSqueezyStoreId: z.string().optional(),
  lemonSqueezyWebhookSecret: z.string().optional(),
  lemonSqueezyVariantIdMonthly: z.string().optional(),
  lemonSqueezyVariantIdYearly: z.string().optional(),
  // Per-user data compaction (see services/compaction.ts)
  compactionEnabled: z.boolean(),
  compactionAgeMonths: z.coerce.number().int().min(1).max(120).default(3),
  compactionMaxBytesPerUser: z.coerce.number().int().min(1024 * 1024).default(10 * 1024 * 1024),
  compactionChatKeepLast: z.coerce.number().int().min(1).max(500).default(50),
  compactionSweepUsers: z.coerce.number().int().min(1).max(1000).default(50),
});

const PORT = process.env.PORT;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? null : 'dev-secret-change-in-production');
if (JWT_SECRET === 'dev-secret-change-in-production') {
  logger.warn('JWT_SECRET is using development default; set a real secret for production');
}
// Clean up CORS origins — trim whitespace and trailing slashes to prevent subtle mismatches
const rawCorsOrigin = process.env.CORS_ORIGIN?.trim().replace(/\/+$/, '');
/**
 * CORS_ORIGIN supports a comma-separated list
 * (e.g. "https://app.example.com,https://staging.example.com").
 *
 * Split it once, here, before anything reads it: both CORS_ORIGIN and FRONTEND_ORIGIN are
 * derived from this list, and FRONTEND_ORIGIN is itself read by the CORS_ORIGIN fallback
 * below — so the split cannot live inside that IIFE without a temporal dead zone.
 *
 * Empty segments are dropped. A trailing comma or a stray space is an operator typo, not a
 * request to allowlist the empty-string origin, and without the filter it would fail the
 * schema's per-entry check and take the whole process down at boot.
 */
const CORS_ORIGIN_LIST = (rawCorsOrigin ?? '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);
/**
 * FRONTEND_ORIGIN is a single origin — it is concatenated into absolute URLs by the Twitter
 * OAuth callback, the LemonSqueezy checkout redirects, password-reset links and the VAPID
 * subject. Defaulting it to the *raw* CORS_ORIGIN put the whole comma-separated list into
 * those URLs. Default to the first origin in the list instead; an explicit value still wins.
 */
const FRONTEND_ORIGIN: string | undefined =
  (process.env.FRONTEND_ORIGIN?.trim().replace(/\/+$/, '')) || CORS_ORIGIN_LIST[0];
const CORS_ORIGIN: string | string[] | boolean = (() => {
  if (CORS_ORIGIN_LIST.length > 1) return CORS_ORIGIN_LIST;
  // One origin stays a string, not a one-element array: cors() and the startup log in app.ts
  // both read this value and single-origin deployments must come out unchanged.
  if (CORS_ORIGIN_LIST.length === 1) return CORS_ORIGIN_LIST[0];
  if (!isProduction) return true;
  if (FRONTEND_ORIGIN !== undefined) return FRONTEND_ORIGIN;
  // Production with no usable origin. Hand the guards below the same value the pre-list
  // parser did, so each still fails by the name the operator typed: CORS_ORIGIN absent ->
  // `true`, caught by the "not true" guard; set but blank -> '', caught by the "must be
  // explicitly set" guard. Set to nothing but separators reaches neither guard, and the
  // schema rejects '' with a message that also names CORS_ORIGIN.
  return rawCorsOrigin === undefined ? true : '';
})();
if (isProduction && (CORS_ORIGIN === true || CORS_ORIGIN === 'true')) {
  throw new Error('CORS_ORIGIN must be an explicit origin in production, not true');
}
if (isProduction && !rawCorsOrigin) {
  throw new Error('CORS_ORIGIN must be explicitly set in production for security.');
}

const rawConfig = {
  port: Number(PORT),
  host: process.env.HOST,
  isProduction,
  dbUrl: DATABASE_URL,
  isDbConfigured: !!DATABASE_URL,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL,
  jwtSecret: JWT_SECRET,
  sessionTtlMs: resolveSessionTtlMs(),
  aiMonthlyLimit: process.env.AI_MONTHLY_LIMIT,
  corsOrigin: CORS_ORIGIN,
  frontendOrigin: FRONTEND_ORIGIN,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  facebookAppId: process.env.FACEBOOK_APP_ID,
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
  twitterClientId: process.env.TWITTER_CLIENT_ID,
  twitterClientSecret: process.env.TWITTER_CLIENT_SECRET,
  twitterRedirectUri: process.env.TWITTER_REDIRECT_URI,
  mcpSecret: process.env.TRACKVIBE_MCP_SECRET,
  mcpUserId: process.env.TRACKVIBE_MCP_USER_ID,
  appBaseUrl: process.env.APP_BASE_URL || process.env.FRONTEND_URL,
  resendApiKey: process.env.RESEND_API_KEY,
  resendFrom: process.env.RESEND_FROM,
  redisUrl: process.env.REDIS_URL ?? process.env.REDIS_PRIVATE_URL,
  isRedisConfigured: !!(process.env.REDIS_URL ?? process.env.REDIS_PRIVATE_URL),
  eventTransport: process.env.EVENT_TRANSPORT === 'sqs' ? 'sqs' : 'redis',
  awsRegion: process.env.AWS_REGION,
  awsS3Bucket: process.env.AWS_S3_BUCKET,
  eventQueueUrl: process.env.EVENT_QUEUE_URL,
  voiceQueueUrl: process.env.VOICE_QUEUE_URL,
  bodyDbUrl: process.env.BODY_DATABASE_URL,
  energyDbUrl: process.env.ENERGY_DATABASE_URL,
  goalsDbUrl: process.env.GOALS_DATABASE_URL,
  bodyServiceUrl: process.env.BODY_SERVICE_URL,
  energyServiceUrl: process.env.ENERGY_SERVICE_URL,
  goalsServiceUrl: process.env.GOALS_SERVICE_URL,
  separateWorkers: process.env.SEPARATE_WORKERS === 'true' || process.env.SEPARATE_WORKERS === '1',
  voiceExecuteOnServer: process.env.VOICE_EXECUTE_ON_SERVER !== 'false',
  voiceStreaming: process.env.VOICE_STREAMING !== 'false',
  geminiLiveModel: process.env.GEMINI_LIVE_MODEL,
  skipSchemaInit: process.env.SKIP_SCHEMA_INIT === 'true' || process.env.SKIP_SCHEMA_INIT === '1' || isProduction,
  lemonSqueezyApiKey: process.env.LEMONSQUEEZY_API_KEY,
  lemonSqueezyStoreId: process.env.LEMONSQUEEZY_STORE_ID,
  lemonSqueezyWebhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
  lemonSqueezyVariantIdMonthly: process.env.LEMONSQUEEZY_VARIANT_ID_MONTHLY,
  lemonSqueezyVariantIdYearly: process.env.LEMONSQUEEZY_VARIANT_ID_YEARLY,
  compactionEnabled: process.env.COMPACTION_ENABLED !== 'false' && process.env.COMPACTION_ENABLED !== '0',
  compactionAgeMonths: process.env.COMPACTION_AGE_MONTHS ?? 3,
  compactionMaxBytesPerUser: process.env.COMPACTION_MAX_BYTES_PER_USER ?? 10 * 1024 * 1024,
  compactionChatKeepLast: process.env.COMPACTION_CHAT_KEEP_LAST ?? 50,
  compactionSweepUsers: process.env.COMPACTION_SWEEP_USERS ?? 50,
};

const parsed = configSchema.safeParse(rawConfig);
if (!parsed.success) {
  const first = parsed.error.errors[0];
  throw new Error(first ? `${first.path.join('.')}: ${first.message}` : 'Invalid configuration');
}

export const config = parsed.data;

/**
 * The silent-failure configuration, called out because testing it on yourself cannot catch it.
 *
 * `onboarding@resend.dev` is Resend's shared sandbox sender, and it only delivers to the
 * Resend account's OWN address. With a key but no verified sending domain, password reset
 * appears to work when the operator tries it and reaches no other user at all — the request
 * succeeds, the API returns 200, and nothing in the logs says the mail went nowhere.
 */
if (config.resendApiKey && !config.resendFrom) {
  logger.warn(
    'RESEND_API_KEY is set but RESEND_FROM is not, so email is sent from Resend\'s shared ' +
    'sandbox sender (onboarding@resend.dev). That address only delivers to your own Resend ' +
    'account address: password reset emails will NOT reach your users. Verify a domain in ' +
    'Resend and set RESEND_FROM to an address on it.',
  );
}

if (config.isProduction && !config.isRedisConfigured) {
  logger.warn(
    'REDIS_URL is not set in production: rate limiting, the voice job queue, and the JWT logout blocklist ' +
    'fall back to in-memory stores that are not shared across instances. Configure Redis before scaling beyond one process.',
  );
}
