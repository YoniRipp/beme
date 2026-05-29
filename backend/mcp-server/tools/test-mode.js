import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tools/ lives inside backend/mcp-server/, so the backend project root is two up.
const BACKEND_DIR = path.resolve(__dirname, '..', '..');

function text(t) {
  return { content: [{ type: 'text', text: typeof t === 'string' ? t : JSON.stringify(t, null, 2) }] };
}

// Keep tool output bounded so long test logs don't blow up the agent's context.
function tail(str, max = 8000) {
  if (!str) return '';
  return str.length > max ? `…(truncated ${str.length - max} chars)…\n${str.slice(-max)}` : str;
}

async function runCommand(cmd, timeoutMs) {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: BACKEND_DIR,
      timeout: timeoutMs,
      maxBuffer: 20 * 1024 * 1024,
    });
    return { ok: true, stdout: tail(stdout), stderr: tail(stderr) };
  } catch (err) {
    // exec rejects on non-zero exit (i.e. failing tests) — surface it as data.
    return {
      ok: false,
      code: err.code,
      killed: err.killed === true,
      stdout: tail(err.stdout || ''),
      stderr: tail(err.stderr || err.message || ''),
    };
  }
}

function listItems(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

// Resources owned by the impersonated user that reset/seed operate on.
const USER_RESOURCES = [
  '/api/food-entries',
  '/api/workouts',
  '/api/weight-entries',
  '/api/goals',
  '/api/daily-check-ins',
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function register(server, api) {
  // ── Running the existing suite through MCP ──────────────────────────────

  server.tool(
    'run_tests',
    'Run the backend test suite (vitest) and return pass/fail output. Optionally pass a file/name pattern to run a subset. Use this to verify a fix did not break anything.',
    z.object({
      pattern: z.string().optional().describe('Optional vitest filter (file path or test name substring)'),
      timeoutMs: z.number().optional().describe('Max run time in ms (default 300000)'),
    }),
    async ({ pattern, timeoutMs }) => {
      const cmd = pattern ? `npm test -- ${pattern}` : 'npm test';
      const result = await runCommand(cmd, timeoutMs ?? 300000);
      return text({ command: cmd, passed: result.ok, ...result });
    }
  );

  server.tool(
    'run_typecheck',
    'Run the TypeScript typecheck (tsc --noEmit) on the backend and return any type errors.',
    z.object({}),
    async () => {
      const result = await runCommand('npm run lint', 120000);
      return text({ passed: result.ok, ...result });
    }
  );

  // ── Live exploratory testing: lifecycle / fixtures ──────────────────────

  server.tool(
    'reset_test_data',
    'Delete ALL of the test user\'s food entries, workouts, weight entries, goals, and daily check-ins. Gives a clean slate before a test run. Only affects the impersonated test user — never use against a real account.',
    z.object({}),
    async () => {
      const summary = {};
      for (const base of USER_RESOURCES) {
        let deleted = 0;
        const errors = [];
        const list = await api.raw('GET', `${base}?limit=200`);
        for (const item of listItems(list.body)) {
          if (!item?.id) continue;
          const del = await api.raw('DELETE', `${base}/${item.id}`);
          if (del.ok || del.status === 204) deleted++;
          else errors.push({ id: item.id, status: del.status, body: del.body });
        }
        summary[base] = errors.length ? { deleted, errors } : { deleted };
      }
      return text({ reset: true, summary });
    }
  );

  server.tool(
    'seed_test_data',
    'Create a known set of fixture data for the test user (one food entry, one workout, one goal, one weight entry) so tests run against predictable state. Returns the created items and any failures.',
    z.object({
      date: z.string().optional().describe('Date for the fixtures in YYYY-MM-DD (default: today)'),
    }),
    async ({ date }) => {
      const d = date || today();
      const fixtures = [
        { label: 'food', path: '/api/food-entries', body: { date: d, name: 'Test Chicken Breast', calories: 330, protein: 62, carbs: 0, fats: 7, portionAmount: 200, portionUnit: 'g', mealType: 'lunch' } },
        { label: 'workout', path: '/api/workouts', body: { date: d, title: 'Test Push Day', type: 'strength', durationMinutes: 45, exercises: [{ name: 'Bench Press', sets: 4, reps: 8 }] } },
        { label: 'goal', path: '/api/goals', body: { type: 'workouts', target: 5, period: 'weekly' } },
        { label: 'weight', path: '/api/weight-entries', body: { date: d, weight: 75 } },
      ];
      const created = {};
      for (const f of fixtures) {
        const res = await api.raw('POST', f.path, f.body);
        created[f.label] = { status: res.status, ok: res.ok, body: res.body };
      }
      return text({ seeded: true, date: d, created });
    }
  );

  // ── Observability: see what happened server-side ────────────────────────

  server.tool(
    'get_app_logs',
    "Read the backend application logs (level 'error' or 'action'). Requires the test user to be an admin. Use after a test to check for server-side errors that the HTTP response didn't reveal.",
    z.object({
      level: z.enum(['error', 'action']).optional().describe("Log level to fetch (default 'error')"),
    }),
    async ({ level }) => {
      const res = await api.raw('GET', `/api/admin/logs?level=${level || 'error'}`);
      return text(res);
    }
  );

  server.tool(
    'get_metrics',
    'Read the backend runtime metrics (per-endpoint request counts and latency, DB queries, error counts, cache, events). Requires the test user to be an admin. Useful for verifying behavior and spotting slow/failing endpoints.',
    z.object({}),
    async () => {
      const res = await api.raw('GET', '/api/admin/metrics');
      return text(res);
    }
  );

  server.tool(
    'get_admin_stats',
    'Read aggregated business stats (user counts, subscriptions, trainer metrics, weekly active users). Requires the test user to be an admin.',
    z.object({}),
    async () => {
      const res = await api.raw('GET', '/api/admin/stats');
      return text(res);
    }
  );

  // ── Escape hatch: hit any endpoint and inspect the raw response ──────────

  server.tool(
    'call_raw',
    'Call any backend API endpoint directly and return the raw { status, ok, body } WITHOUT throwing on error. Use this to test error paths (e.g. that invalid input returns 400) or endpoints not yet wrapped as dedicated tools.',
    z.object({
      method: z.enum(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']).describe('HTTP method'),
      path: z.string().describe('API path starting with /api, e.g. /api/food-entries'),
      body: z.any().optional().describe('JSON request body for POST/PATCH/PUT'),
    }),
    async ({ method, path: p, body }) => {
      const res = await api.raw(method, p, body);
      return text(res);
    }
  );
}
