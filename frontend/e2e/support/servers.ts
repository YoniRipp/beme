/**
 * Where this checkout's E2E dev servers live — and proof that the servers answering on
 * those ports really are this checkout's.
 *
 * The repo is worked in many git worktrees at once (`.claude/worktrees/…`). Every one of
 * them named port 5173 for Vite and 3000 for the API, and Playwright's `reuseExistingServer`
 * reuses whatever already listens on a port without asking what it is. The first
 * `npm run dev` on the machine therefore won the port and every run afterwards — from any
 * worktree — tested *that* checkout while reporting against the branch you were on. It cost
 * two people real time on 2026-09-14 before anyone suspected the port, and the reverse case
 * (a branch missing a fix passing because the server has it) leaves no trace at all.
 *
 * Two changes close it:
 *
 *   1. Ports are derived from this checkout's path, so no two worktrees name the same one.
 *      `reuseExistingServer` stays on, so the fast local loop is unchanged.
 *   2. `assertServersAreOurs()` asks each running server which checkout it is serving and
 *      fails the run by name if the answer is not this one. Derived ports make a clash
 *      unlikely; this makes a clash loud instead of silent.
 *
 * Turning `reuseExistingServer` off instead was measured and rejected: the server starts are
 * cheap (~1–3s each), but Playwright refuses to run at all when the URL is already taken, so
 * one worktree's dev server would block E2E in every other worktree on the machine.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** `<checkout>/frontend` — this file is `<checkout>/frontend/e2e/support/servers.ts`. */
export const FRONTEND_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

/** `<checkout>` — the worktree root, the thing that differs between concurrent runs. */
export const CHECKOUT_ROOT = path.resolve(FRONTEND_ROOT, '..');

/** `<checkout>/backend`, the cwd Playwright starts the API server in. */
export const BACKEND_ROOT = path.join(CHECKOUT_ROOT, 'backend');

/**
 * Ports sit above the well-known range and below the *lowest* ephemeral range we run on, so
 * the OS never hands one of ours out to an unrelated outbound socket. macOS starts its
 * ephemeral range at 49152, but Linux's default `ip_local_port_range` starts at 32768 — and
 * the lower bound is the one that matters, because `--strictPort` turns a momentary clash
 * into a failed run rather than a silent move to the next port.
 */
const PORT_MIN = 20_000;
const PORT_MAX = 32_767;
const PORT_SPAN = PORT_MAX - PORT_MIN + 1;

/**
 * Stable per checkout, so a rerun finds — and reuses — the server the last run started.
 *
 * Two worktrees can still hash to one port: with ~30 checkouts on a machine that is a few
 * percent, and it only bites when both are running servers at the same moment. That case is
 * what `assertServersAreOurs()` is for; it names the collision and the override rather than
 * quietly testing the wrong tree.
 *
 * The span is ~12.7k, so a frontend/backend self-collision is roughly 1 in 12,800.
 */
function derivePort(salt: string): number {
  // Hashed as two chunks rather than one concatenated string, so no separator character
  // has to be chosen (and no NUL byte ends up sitting in a source file).
  const digest = createHash('sha256').update(salt).update(CHECKOUT_ROOT).digest();
  return PORT_MIN + (digest.readUInt32BE(0) % PORT_SPAN);
}

function envPort(name: string): number | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return undefined;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be a port number between 1 and 65535, got "${raw}"`);
  }
  return port;
}

function resolvePorts(): { frontend: number; backend: number } {
  const frontendOverride = envPort('E2E_FRONTEND_PORT');
  const backendOverride = envPort('E2E_BACKEND_PORT');
  let frontend = frontendOverride ?? derivePort('frontend');
  let backend = backendOverride ?? derivePort('backend');

  if (frontend === backend) {
    if (frontendOverride !== undefined && backendOverride !== undefined) {
      throw new Error(
        `E2E_FRONTEND_PORT and E2E_BACKEND_PORT are both ${frontend}; they must differ.`
      );
    }
    // A hash coincidence. Nudge whichever side we derived — never the one the developer
    // pinned, or their explicit port would move under them without a word, which is the
    // class of silent surprise this file exists to remove.
    const nudge = (p: number) => (p === PORT_MAX ? PORT_MIN : p + 1);
    if (backendOverride === undefined) backend = nudge(backend);
    else frontend = nudge(frontend);
  }

  return { frontend, backend };
}

const ports = resolvePorts();

export const frontendPort = ports.frontend;
export const backendPort = ports.backend;
export const frontendBaseURL = `http://localhost:${frontendPort}`;
export const backendBaseURL = `http://localhost:${backendPort}`;

/** Served by the dev-only Vite plugin in `vite.config.ts`. */
export const IDENTITY_PATH = '/__e2e/identity';

/**
 * Where the app sends its API calls when nothing sets `VITE_API_URL` — the dev fallback in
 * `src/core/api/client.ts`. Under `SKIP_BACKEND` that is what the suite talks to, and this
 * run neither starts it nor knows whose it is.
 */
export const UNMANAGED_API_BASE_URL = 'http://localhost:3000';

/**
 * Only `1` and `true` enable a flag, matching `backend/src/config/index.ts`. A bare `!!` reads
 * `E2E_ALLOW_FOREIGN_SERVER=0` as "yes, allow it" and silently downgrades a real mismatch to a
 * warning — the precise failure this file exists to prevent, re-entered through the off switch.
 */
function envFlag(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  return raw === '1' || raw === 'true';
}

/** `SKIP_BACKEND=1` means "use whatever API is already there" — an explicit opt-out. */
export const skipBackend = envFlag('SKIP_BACKEND');

const allowForeignServer = envFlag('E2E_ALLOW_FOREIGN_SERVER');

/**
 * The last line of every diagnostic. Offering the escape hatch to someone who has already
 * taken it reads like the guard has not noticed, so say what is actually happening instead.
 */
const ESCAPE_HATCH = allowForeignServer
  ? 'E2E_ALLOW_FOREIGN_SERVER is set, so this is a warning and the run continues — whatever it reports is about the server above, not about your branch.'
  : 'Set E2E_ALLOW_FOREIGN_SERVER=1 to downgrade this to a warning.';

/** Symlinked temp dirs and `/tmp` vs `/private/tmp` would otherwise read as a mismatch. */
function real(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

/**
 * Is `served` this checkout, or somewhere inside it?
 *
 * The backend reports `process.cwd()`, which is `<checkout>/backend` when Playwright starts
 * it but the repo root for someone running `tsx watch backend/index.ts` from the top. Both
 * are this checkout, and the property being guarded is the checkout — not the cwd. The
 * separator test keeps `<checkout>-2` from passing as `<checkout>`.
 */
function isInsideCheckout(served: string): boolean {
  const root = real(CHECKOUT_ROOT);
  const actual = real(served);
  return actual === root || actual.startsWith(root + path.sep);
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${url} responded ${res.status} ${res.statusText}`);
  return (await res.json()) as Record<string, unknown>;
}

function report(lines: string[]): void {
  const message = [...lines, '', ESCAPE_HATCH].join('\n');
  if (allowForeignServer) {
    console.warn(`\n[e2e] ${message}\n`);
    return;
  }
  throw new Error(message);
}

function mismatchLines(
  label: string,
  url: string,
  expected: string,
  actual: string,
  override: string
): string[] {
  return [
    `E2E ${label} server mismatch: the server on ${url} is not serving this checkout.`,
    '',
    `  this checkout    : ${expected}`,
    `  server is serving: ${actual}`,
    '',
    'Playwright reuses whatever already listens on a port, so this run would otherwise have',
    "tested that other checkout's code and reported the result against your branch.",
    '',
    `Stop the other server, or point this run at a different port with ${override}=<port>.`,
  ];
}

async function assertFrontendIsOurs(): Promise<void> {
  const url = `${frontendBaseURL}${IDENTITY_PATH}`;
  let body: Record<string, unknown>;
  try {
    body = await fetchJson(url);
  } catch (cause) {
    report([
      `E2E frontend identity check failed: could not read ${url}.`,
      '',
      `  ${(cause as Error).message}`,
      '',
      `Something is answering on ${frontendBaseURL} that is not this checkout's Vite dev`,
      'server — a dev server from another worktree that predates this guard, or an unrelated',
      'process on the same port. This run would otherwise have tested it and reported the',
      'result against your branch.',
      '',
      'Stop it, or point this run at a different port with E2E_FRONTEND_PORT=<port>.',
    ]);
    return;
  }

  const served = typeof body.root === 'string' ? body.root : '(no root reported)';
  if (real(served) !== real(FRONTEND_ROOT)) {
    report(mismatchLines('frontend', frontendBaseURL, FRONTEND_ROOT, served, 'E2E_FRONTEND_PORT'));
  }
}

async function assertBackendIsOurs(): Promise<void> {
  const url = `${backendBaseURL}/health`;
  let body: Record<string, unknown>;
  try {
    body = await fetchJson(url);
  } catch (cause) {
    report([
      `E2E backend identity check failed: could not read ${url}.`,
      '',
      `  ${(cause as Error).message}`,
      '',
      `Something is answering on ${backendBaseURL} that is not this checkout's API server.`,
      '',
      'Stop it, or point this run at a different port with E2E_BACKEND_PORT=<port>.',
      'SKIP_BACKEND=1 runs without a managed API server at all.',
    ]);
    return;
  }

  // `checkout` is opt-in via E2E_IDENTITY, which only this config's `webServer` sets (see
  // `backend/app.ts`). A production build omits it, so does any backend older than this
  // guard, and so does one a developer started by hand — none of those is the server we
  // just started, so the run must not continue against them silently.
  if (typeof body.checkout !== 'string') {
    report([
      ...mismatchLines(
        'backend',
        backendBaseURL,
        CHECKOUT_ROOT,
        '(no checkout reported)',
        'E2E_BACKEND_PORT'
      ),
      '',
      'A backend only reports its checkout when started with E2E_IDENTITY=1, which this',
      'config does for the server it starts. If that is your own backend on that port,',
      'let Playwright start its own instead, or restart yours with E2E_IDENTITY=1.',
    ]);
    return;
  }
  if (!isInsideCheckout(body.checkout)) {
    report(
      mismatchLines('backend', backendBaseURL, CHECKOUT_ROOT, body.checkout, 'E2E_BACKEND_PORT')
    );
  }
}

/**
 * Runs from `globalSetup`, which Playwright runs *after* `webServer` — so by the time this
 * executes, either Playwright started our servers or it reused something that was already
 * there, and this is what tells the two apart.
 */
export async function assertServersAreOurs(): Promise<void> {
  await assertFrontendIsOurs();
  if (!skipBackend) await assertBackendIsOurs();
}
