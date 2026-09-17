/**
 * Smoke test for the MCP server.
 *
 * This package ships separately from the monorepo, has no unit tests, and had no CI job at
 * all -- so a Dependabot PR against it went green without anything having looked at it. Its
 * three dependencies are the kind where a major matters: `@modelcontextprotocol/sdk` owns
 * the wire protocol and `zod` owns every tool's input schema, and either can produce a
 * server that starts fine and fails on the first real call.
 *
 * Whether a given bump actually breaks it is a question this answers rather than assumes.
 * zod 4.6.5 was checked against it on 2026-09-14 and passes every assertion below.
 *
 * So this does not import the server. It spawns `index.js` the way `.mcp.json` does and
 * speaks MCP to it over stdio, which is the thing that actually has to work. `tools/list`
 * and `resources/list` never reach the TrackVibe API, so no backend is needed.
 *
 * Two runs, because the interesting property is the gate:
 *
 *   default          31 tools -- and NONE of the diagnostic ones
 *   both gates on    45 tools -- the number CLAUDE.md documents
 *
 * `test-mode` and `ops` are withheld unless `MCP_TEST_MODE` / `MCP_OPS_MODE` are set,
 * because they include `call_raw`, `reset_test_data` and `run_tests`. Leaking those into a
 * normal session is the failure worth catching, so the default run asserts their absence
 * rather than only counting what is present.
 *
 * Counts are minimums. Adding a tool is ordinary work and must not fail CI; silently losing
 * one to a dependency bump is what this exists to catch.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENTRYPOINT = path.join(__dirname, 'index.js');

const EXPECTED_TOOLS_DEFAULT = 31;
const EXPECTED_TOOLS_GATED = 45; // documented in CLAUDE.md
const EXPECTED_RESOURCES = 4;

/**
 * One anchor tool per non-gated module, matched by exact name.
 *
 * Substring matching was the obvious thing here and it is wrong: `food-entries` and
 * `food-search` both contain "food", so a single `'food'` check passes while one of the two
 * has registered nothing at all. Exact names keep the ten modules genuinely independent.
 */
const MODULE_ANCHORS = {
  'food-entries': 'add_food_entry',
  'food-search': 'search_foods',
  workouts: 'add_workout',
  water: 'add_water_glass',
  weight: 'add_weight_entry',
  goals: 'add_goal',
  checkins: 'add_daily_checkin',
  exercises: 'search_exercises',
  profile: 'get_profile',
  streaks: 'get_streaks',
};

/** From tools/test-mode.js. None of these may appear without MCP_TEST_MODE. */
const TEST_MODE_TOOLS = [
  'run_tests',
  'run_typecheck',
  'reset_test_data',
  'seed_test_data',
  'get_app_logs',
  'get_metrics',
  'get_admin_stats',
  'call_raw',
];

const failures = [];

/**
 * `server.tool(name, description, shape, handler)` wants a raw shape -- `{ a: z.string() }` --
 * not a wrapped `z.object({ a: z.string() })`.
 *
 * SDK 1.25 accepted both, so the wrapped form worked for as long as nobody upgraded. 1.30
 * rejects it outright: "Tool list_food_entries expected a Zod schema or ToolAnnotations, but
 * received an unrecognized object", thrown at import, before the server ever starts.
 *
 * The runtime checks below catch that on an SDK that rejects it. This one catches it on an
 * SDK that does not, which is the window in which the mistake actually gets reintroduced.
 * Only the third argument is in scope -- it sits at 4-space indent. Nested `z.object(...)`
 * inside a `z.array(...)` field is deeper, and is a real schema that must stay wrapped.
 */
async function checkToolSignatures(registeredToolCount) {
  const { readdir, readFile } = await import('node:fs/promises');
  const dir = path.join(__dirname, 'tools');
  const offenders = [];
  let callSites = 0;

  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.js'))) {
    const lines = (await readFile(path.join(dir, file), 'utf8')).split('\n');
    lines.forEach((line, i) => {
      if (/^ {2}server\.tool\($/.test(line)) callSites++;
      if (/^ {4}z\.object\(\{/.test(line)) offenders.push(`tools/${file}:${i + 1}`);
    });
  }

  // The guard above keys on indentation, so reformatting these files would make it match
  // nothing and report success having inspected nothing -- a guard that fails open is worse
  // than no guard. Anchor it: the call sites it can see must equal the tools the running
  // server actually registered. Lose visibility and this fires instead of passing quietly.
  check(
    callSites === registeredToolCount,
    `the source scan sees every registered tool (${callSites} call sites vs ${registeredToolCount} registered)`
  );
  check(
    offenders.length === 0,
    `no server.tool() passes a wrapped z.object() as its shape${offenders.length ? ` (${offenders.join(', ')})` : ''}`
  );
}

/**
 * stdout is the JSON-RPC transport. Nothing else may write a byte to it.
 *
 * Every check above this one went green while dotenv 17 was printing
 * "◇ injected env (0) from ../.env // tip: ..." ahead of the initialize response, because
 * the SDK's client transport quietly skips lines it cannot parse. A stricter client does
 * not, and neither does the protocol. So this drives the server the raw way -- one
 * initialize frame in, every line out parsed as JSON -- rather than through a client that
 * forgives the thing being tested.
 */
async function checkStdoutIsPureJsonRpc() {
  const { spawn } = await import('node:child_process');
  const child = spawn(process.execPath, [ENTRYPOINT], {
    env: { ...process.env, MCP_TEST_MODE: 'false', MCP_OPS_MODE: 'false', TRACKVIBE_API_URL: 'http://127.0.0.1:1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  child.stdout.on('data', (c) => (stdout += c.toString()));
  child.stdin.write(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } },
    }) + '\n'
  );

  await new Promise((resolve) => setTimeout(resolve, 1500));
  child.kill();

  const lines = stdout.split('\n').filter((l) => l.trim() !== '');
  const notJson = lines.filter((l) => {
    try {
      JSON.parse(l);
      return false;
    } catch {
      return true;
    }
  });

  check(lines.length > 0, 'the server answers initialize on stdout');
  check(
    notJson.length === 0,
    `stdout carries only JSON-RPC${notJson.length ? ` (${notJson.length} stray line(s), first: ${JSON.stringify(notJson[0].slice(0, 80))})` : ''}`
  );
}

function check(condition, message) {
  if (condition) {
    console.log(`  ok   ${message}`);
  } else {
    console.log(`  FAIL ${message}`);
    failures.push(message);
  }
}

/**
 * Spawn the real entrypoint, ask it what it exposes, shut it down.
 *
 * The gate flags are pinned off rather than merely omitted. `index.js` runs `dotenv.config()`
 * over `backend/.env` and `backend/mcp-server/.env`, and dotenv does not overwrite a variable
 * that is already set -- so an explicit `'false'` beats both a developer's shell and their
 * `.env`. Without that, someone who has `MCP_TEST_MODE=true` set locally (which is what the
 * flag is *for*) would see the default run report leaked diagnostic tools: a failure that
 * reads like a security regression when the gate is in fact working.
 */
async function inspect(env) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [ENTRYPOINT],
    env: {
      ...process.env,
      MCP_TEST_MODE: 'false',
      MCP_OPS_MODE: 'false',
      // Point at a port nothing listens on. Listing must not need the API; if it ever does,
      // that is itself a regression worth failing on.
      TRACKVIBE_API_URL: 'http://127.0.0.1:1',
      ...env,
    },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'trackvibe-smoke-test', version: '1.0.0' });

  // Attached before connecting, and reported on the failure path too. If a dependency bump
  // makes index.js throw at import time, the server's own stack trace is the entire answer --
  // and connect() rejecting is precisely when a listener registered after the await would
  // never have run.
  let stderr = '';
  transport.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    const { resources } = await client.listResources();
    return { tools, resources, stderr };
  } catch (error) {
    error.serverStderr = stderr;
    throw error;
  } finally {
    await client.close().catch(() => {});
  }
}

let serverStderr = '';

try {
  console.log('MCP server smoke test\n');

  console.log('default (no gates):');
  const base = await inspect({});
  serverStderr += base.stderr;

  check(
    base.tools.length >= EXPECTED_TOOLS_DEFAULT,
    `registers at least ${EXPECTED_TOOLS_DEFAULT} tools (got ${base.tools.length})`
  );
  check(
    base.resources.length >= EXPECTED_RESOURCES,
    `registers at least ${EXPECTED_RESOURCES} resources (got ${base.resources.length})`
  );

  const baseNames = base.tools.map((t) => t.name);
  for (const [module, anchor] of Object.entries(MODULE_ANCHORS)) {
    check(baseNames.includes(anchor), `tools/${module}.js registered (${anchor})`);
  }

  const leakedOps = baseNames.filter((n) => n.startsWith('ops_'));
  check(
    leakedOps.length === 0,
    `no ops_* tools without MCP_OPS_MODE${leakedOps.length ? ` (leaked: ${leakedOps.join(', ')})` : ''}`
  );

  const leakedTest = baseNames.filter((n) => TEST_MODE_TOOLS.includes(n));
  check(
    leakedTest.length === 0,
    `no diagnostic tools without MCP_TEST_MODE${leakedTest.length ? ` (leaked: ${leakedTest.join(', ')})` : ''}`
  );

  // A tool with no input schema means zod produced nothing usable -- the exact shape a major
  // zod bump breaks, and one that a bare "the server started" check sails straight past.
  const schemaless = base.tools.filter((t) => !t.inputSchema || typeof t.inputSchema !== 'object');
  check(
    schemaless.length === 0,
    `every tool exposes an input schema${schemaless.length ? ` (missing: ${schemaless.map((t) => t.name).join(', ')})` : ''}`
  );

  // `/api/weight-entries` and `/api/water-entries/history` are the only two list endpoints whose
  // controller uses `parseOptionalPagination`, which emits no LIMIT at all when the caller sends
  // neither bound. An LLM omits an optional argument routinely, so `limit` on these two tools has
  // to carry a default -- otherwise the read is the user's whole table, which is critical rule 6.
  // Every other list tool hits a controller with `paginationSchema` and its server-side 50, so
  // this check names exactly two tools rather than sweeping all of them.
  const MUST_DEFAULT_LIMIT = ['list_weight_entries', 'get_water_history'];
  const undefaulted = MUST_DEFAULT_LIMIT.filter((name) => {
    const tool = base.tools.find((t) => t.name === name);
    return typeof tool?.inputSchema?.properties?.limit?.default !== 'number';
  });
  check(
    undefaulted.length === 0,
    `the two unbounded-endpoint tools default their limit${undefaulted.length ? ` (missing: ${undefaulted.join(', ')})` : ''}`
  );

  const offUri = base.resources.filter((r) => !r.uri?.startsWith('trackvibe://'));
  check(offUri.length === 0, 'every resource is published under trackvibe://');

  console.log('\nwith MCP_TEST_MODE and MCP_OPS_MODE:');
  const gated = await inspect({ MCP_TEST_MODE: 'true', MCP_OPS_MODE: 'true' });
  serverStderr += gated.stderr;

  check(
    gated.tools.length >= EXPECTED_TOOLS_GATED,
    `registers at least ${EXPECTED_TOOLS_GATED} tools (got ${gated.tools.length})`
  );
  const gatedNames = gated.tools.map((t) => t.name);
  check(
    gatedNames.some((n) => n.startsWith('ops_')),
    'the ops_* tools appear once MCP_OPS_MODE is set'
  );
  check(
    TEST_MODE_TOOLS.every((n) => gatedNames.includes(n)),
    'every diagnostic tool appears once MCP_TEST_MODE is set'
  );

  console.log('\nstdout hygiene:');
  await checkStdoutIsPureJsonRpc();

  // Last, because it needs the gated count to check itself against.
  console.log('\nsource:');
  await checkToolSignatures(gated.tools.length);
} catch (error) {
  console.error('\nMCP server smoke test could not complete:');
  console.error(error instanceof Error ? error.stack : error);
  if (error?.serverStderr) serverStderr += error.serverStderr;
  process.exitCode = 1;
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exitCode = 1;
} else if (process.exitCode !== 1) {
  console.log('\nAll checks passed.');
}

if (process.exitCode === 1 && serverStderr.trim()) {
  console.error('\n--- server stderr ---\n' + serverStderr.trim());
}
