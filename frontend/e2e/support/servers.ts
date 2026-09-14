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
 * Ports live between the low well-known range and macOS's ephemeral range (49152+), so a
 * derived port never collides with a listener the OS handed out to something else.
 */
const PORT_MIN = 20_000;
const PORT_MAX = 48_999;
const PORT_SPAN = PORT_MAX - PORT_MIN + 1;

/**
 * Stable per checkout, so a rerun finds — and reuses — the server the last run started.
 *
 * Two worktrees can still hash to one port: with ~30 checkouts on a machine that is a few
 * percent, and it only bites when both are running servers at the same moment. That case is
 * what `assertServersAreOurs()` is for; it names the collision and the override rather than
 * quietly testing the wrong tree.
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
  const frontend = frontendOverride ?? derivePort('frontend');
  let backend = backendOverride ?? derivePort('backend');

  if (frontend === backend) {
    if (frontendOverride !== undefined && backendOverride !== undefined) {
      throw new Error(
        `E2E_FRONTEND_PORT and E2E_BACKEND_PORT are both ${frontend}; they must differ.`
      );
    }
    // A 1-in-29000 hash coincidence. Nudging the derived one is cheaper than explaining why
    // the app and the API are fighting over a socket.
    backend = backend === PORT_MAX ? PORT_MIN : backend + 1;
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

/** `SKIP_BACKEND=1` means "use whatever API is already there" — an explicit opt-out. */
export const skipBackend = !!process.env.SKIP_BACKEND;

const allowForeignServer = !!process.env.E2E_ALLOW_FOREIGN_SERVER;

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

  // `checkout` is dev-only (see `backend/app.ts`). A production build omits it, and so does
  // any backend older than this guard — either way it is not the server we just started.
  const served = typeof body.checkout === 'string' ? body.checkout : '(no checkout reported)';
  if (real(served) !== real(BACKEND_ROOT)) {
    report(mismatchLines('backend', backendBaseURL, BACKEND_ROOT, served, 'E2E_BACKEND_PORT'));
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
