/**
 * Config: CORS_ORIGIN parsing and the frontendOrigin derived from it.
 *
 * This is the one test that must import the *real* config module rather than mocking it
 * (`backend/CLAUDE.md`), because the behaviour under test is the module's import-time
 * validation. So every case is `vi.resetModules()` -> set `process.env` -> dynamic import,
 * and every case sets `PORT` — without it `port` fails first and masks the assertion.
 *
 * `dotenv` is mocked to a no-op: the module loads `backend/.env` and `.env.${NODE_ENV}` at
 * import time, and a developer's local `.env` would otherwise inject a `CORS_ORIGIN` and
 * make the "unset" cases pass or fail by accident.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
  config: vi.fn(),
}));

vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createModuleLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

/** Every env var the config module reads that could leak between cases or in from a shell. */
const MANAGED_KEYS = [
  'NODE_ENV',
  'PORT',
  'CORS_ORIGIN',
  'FRONTEND_ORIGIN',
  'JWT_SECRET',
  'SESSION_TTL_DAYS',
  'DATABASE_URL',
  'REDIS_URL',
  'REDIS_PRIVATE_URL',
];

type Env = Record<string, string | undefined>;

let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

function applyEnv(env: Env) {
  for (const key of MANAGED_KEYS) delete process.env[key];
  process.env.PORT = '3001';
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

/** Boot the real config module under `env`. Rejects if the module throws. */
async function loadConfig(env: Env) {
  applyEnv(env);
  vi.resetModules();
  const mod = await import('./index.js');
  return mod.config;
}

/** Boot the real config module under `env` and return the boot error message. */
async function loadConfigError(env: Env): Promise<string> {
  applyEnv(env);
  vi.resetModules();
  try {
    await import('./index.js');
    return '<no error thrown>';
  } catch (err) {
    return (err as Error).message;
  }
}

/** Development arm: vitest's own NODE_ENV, so `isProduction` is false. */
const dev = (env: Env = {}): Env => ({ NODE_ENV: 'test', ...env });
/** Production arm. JWT_SECRET is required there or `jwtSecret` fails before corsOrigin. */
const prod = (env: Env = {}): Env => ({
  NODE_ENV: 'production',
  JWT_SECRET: 'prod-secret',
  ...env,
});

describe('config: CORS_ORIGIN in development', () => {
  it('keeps a single origin a string, not a one-element array', async () => {
    const config = await loadConfig(dev({ CORS_ORIGIN: 'capacitor://localhost' }));
    expect(config.corsOrigin).toBe('capacitor://localhost');
  });

  it('parses a comma-separated list into an array', async () => {
    const config = await loadConfig(
      dev({ CORS_ORIGIN: 'capacitor://localhost,http://localhost:5173' }),
    );
    expect(config.corsOrigin).toEqual(['capacitor://localhost', 'http://localhost:5173']);
  });

  it('trims whitespace and trailing slashes on every entry, not just the last', async () => {
    const config = await loadConfig(
      dev({ CORS_ORIGIN: ' https://a.example.com/ , https://b.example.com// ' }),
    );
    expect(config.corsOrigin).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('drops empty segments from a trailing comma or a stray space', async () => {
    const config = await loadConfig(
      dev({ CORS_ORIGIN: 'https://a.example.com, ,https://b.example.com,' }),
    );
    expect(config.corsOrigin).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('collapses a single origin with a trailing comma back to a string', async () => {
    const config = await loadConfig(dev({ CORS_ORIGIN: 'https://a.example.com,' }));
    expect(config.corsOrigin).toBe('https://a.example.com');
  });

  it('leaves CORS_ORIGIN=true as the string "true", never coerced to a boolean', async () => {
    const config = await loadConfig(dev({ CORS_ORIGIN: 'true' }));
    expect(config.corsOrigin).toBe('true');
    expect(config.corsOrigin).not.toBe(true);
  });

  it('falls back to the boolean true when CORS_ORIGIN is unset', async () => {
    const config = await loadConfig(dev({ CORS_ORIGIN: undefined }));
    expect(config.corsOrigin).toBe(true);
  });

  it('falls back to the boolean true when CORS_ORIGIN has no usable origin', async () => {
    const config = await loadConfig(dev({ CORS_ORIGIN: ' , ' }));
    expect(config.corsOrigin).toBe(true);
  });
});

describe('config: CORS_ORIGIN in production', () => {
  it('accepts a single origin', async () => {
    const config = await loadConfig(prod({ CORS_ORIGIN: 'https://app.example.com' }));
    expect(config.corsOrigin).toBe('https://app.example.com');
  });

  // The regression test. Before the fix this threw
  // `corsOrigin: Expected string, received array` and the process never started.
  it('accepts a comma-separated list', async () => {
    const config = await loadConfig(
      prod({ CORS_ORIGIN: 'https://app.example.com,https://staging.example.com' }),
    );
    expect(config.corsOrigin).toEqual([
      'https://app.example.com',
      'https://staging.example.com',
    ]);
  });

  // A trailing comma is an operator typo, not a reason to refuse to start. Without the
  // `.filter(Boolean)` the new per-entry `.min(1)` would turn this into a fresh boot crash.
  it('accepts a list with a trailing comma', async () => {
    const config = await loadConfig(
      prod({ CORS_ORIGIN: 'https://a.example.com,https://b.example.com,' }),
    );
    expect(config.corsOrigin).toEqual(['https://a.example.com', 'https://b.example.com']);
  });
});

describe('config: production CORS_ORIGIN guards still fire', () => {
  it('rejects CORS_ORIGIN=true', async () => {
    await expect(loadConfigError(prod({ CORS_ORIGIN: 'true' }))).resolves.toBe(
      'CORS_ORIGIN must be an explicit origin in production, not true',
    );
  });

  it('rejects an empty CORS_ORIGIN', async () => {
    await expect(loadConfigError(prod({ CORS_ORIGIN: '' }))).resolves.toBe(
      'CORS_ORIGIN must be explicitly set in production for security.',
    );
  });

  it('rejects an empty CORS_ORIGIN even when FRONTEND_ORIGIN is set', async () => {
    await expect(
      loadConfigError(prod({ CORS_ORIGIN: '', FRONTEND_ORIGIN: 'https://f.example.com' })),
    ).resolves.toBe('CORS_ORIGIN must be explicitly set in production for security.');
  });

  it('rejects an unset CORS_ORIGIN', async () => {
    await expect(loadConfigError(prod({ CORS_ORIGIN: undefined }))).resolves.toBe(
      'CORS_ORIGIN must be an explicit origin in production, not true',
    );
  });

  it('rejects an unset CORS_ORIGIN even when FRONTEND_ORIGIN is set', async () => {
    await expect(
      loadConfigError(
        prod({ CORS_ORIGIN: undefined, FRONTEND_ORIGIN: 'https://f.example.com' }),
      ),
    ).resolves.toBe('CORS_ORIGIN must be explicitly set in production for security.');
  });

  // Separators only: past both guards, caught by the schema. The message must still name
  // the env var — a bare `z.union` would say `Invalid input`, which is what made the
  // original bug unreadable.
  it('rejects a CORS_ORIGIN of separators only, with a message naming CORS_ORIGIN', async () => {
    const message = await loadConfigError(prod({ CORS_ORIGIN: ' , ' }));
    expect(message).toContain('CORS_ORIGIN');
    expect(message).not.toContain('Invalid input');
  });

  // Documented, accepted gap: the `true` guard compares against the scalar, so the literal
  // string survives inside a list. It fails closed — no browser sends `true` as an Origin.
  // Recorded here so it stays a known limitation rather than an accidental one.
  it('does not catch the literal "true" inside a list (known gap, fails closed)', async () => {
    const config = await loadConfig(prod({ CORS_ORIGIN: 'true,https://a.example.com' }));
    expect(config.corsOrigin).toEqual(['true', 'https://a.example.com']);
  });
});

describe('config: frontendOrigin is a single origin, never the whole list', () => {
  // The sibling bug. `frontendOrigin` used to default to the raw, unsplit CORS_ORIGIN, so a
  // list produced `https://app.example.com/,https://staging.example.com` — still a string,
  // so Zod accepted it and the process booted with broken password-reset and OAuth URLs.
  it('defaults to the first origin of a list, not the joined string', async () => {
    const config = await loadConfig(
      dev({ CORS_ORIGIN: 'https://app.example.com/,https://staging.example.com/' }),
    );
    expect(config.frontendOrigin).toBe('https://app.example.com');
    expect(config.frontendOrigin).not.toContain(',');
  });

  it('builds a parseable absolute URL, the way its four consumers do', async () => {
    const config = await loadConfig(
      dev({ CORS_ORIGIN: 'https://app.example.com,https://staging.example.com' }),
    );
    const resetUrl = new URL(`${config.frontendOrigin}/reset-password?token=abc`);
    expect(resetUrl.origin).toBe('https://app.example.com');
    expect(resetUrl.pathname).toBe('/reset-password');
  });

  it('still lets an explicit FRONTEND_ORIGIN win over the list', async () => {
    const config = await loadConfig(
      dev({
        CORS_ORIGIN: 'https://app.example.com,https://staging.example.com',
        FRONTEND_ORIGIN: 'https://explicit.example.com/',
      }),
    );
    expect(config.frontendOrigin).toBe('https://explicit.example.com');
  });

  it('is unchanged for a single origin', async () => {
    const config = await loadConfig(dev({ CORS_ORIGIN: 'https://app.example.com' }));
    expect(config.frontendOrigin).toBe('https://app.example.com');
  });

  it('is undefined in development when CORS_ORIGIN is unset', async () => {
    const config = await loadConfig(dev({ CORS_ORIGIN: undefined }));
    expect(config.frontendOrigin).toBeUndefined();
  });

  it('is the first origin in production too', async () => {
    const config = await loadConfig(
      prod({ CORS_ORIGIN: 'https://app.example.com,https://staging.example.com' }),
    );
    expect(config.frontendOrigin).toBe('https://app.example.com');
  });
});

/**
 * The acceptance criterion the schema alone cannot prove: that the parsed list is actually
 * honoured by the middleware. Built from the real `config.corsOrigin`, mounted the same way
 * `app.ts` and `createStandaloneService.ts` mount it. No database, no app boot.
 */
describe('cors() honours every origin the config parsed', () => {
  const FIRST = 'https://a.example.com';
  const SECOND = 'https://b.example.com';
  const OUTSIDER = 'https://evil.example.com';

  async function appFromConfig() {
    const config = await loadConfig(prod({ CORS_ORIGIN: `${FIRST},${SECOND}` }));
    expect(config.corsOrigin).toEqual([FIRST, SECOND]);

    const app = express();
    app.use(cors({ origin: config.corsOrigin, credentials: true }));
    app.get('/api/ping', (_req, res) => res.json({ ok: true }));
    return app;
  }

  it.each([FIRST, SECOND])('answers a preflight from %s', async (origin) => {
    const app = await appFromConfig();
    const res = await request(app)
      .options('/api/ping')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe(origin);
    // A wildcard here would break every credentialed request, which is the whole point of
    // keeping an explicit allowlist.
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it.each([FIRST, SECOND])('echoes %s on a real request', async (origin) => {
    const app = await appFromConfig();
    const res = await request(app).get('/api/ping').set('Origin', origin);

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('sends no allow-origin header to a third origin', async () => {
    const app = await appFromConfig();

    const preflight = await request(app)
      .options('/api/ping')
      .set('Origin', OUTSIDER)
      .set('Access-Control-Request-Method', 'GET');
    expect(preflight.headers['access-control-allow-origin']).toBeUndefined();

    const real = await request(app).get('/api/ping').set('Origin', OUTSIDER);
    expect(real.headers['access-control-allow-origin']).toBeUndefined();
  });
});
