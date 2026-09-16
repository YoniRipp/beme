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
