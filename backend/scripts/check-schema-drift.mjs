/**
 * Compares the two database bootstrap paths and fails when they disagree.
 *
 * `migrations/` is what production gets; `src/db/schema.ts` (initSchema) is what a dev
 * machine gets. Nothing keeps them in step, and when they drift the symptom is a runtime
 * `42703 column "x" does not exist` from whichever model selects the missing column --
 * which surfaces as a broken feature, not as a schema error anyone can read.
 *
 * A column existing on both sides is not enough. When the two paths disagree on
 * nullability, type or default, every query still compiles and the drift only shows up as
 * a write that succeeds in dev and fails in production -- e.g. user_profiles was NOT NULL
 * on the migrated path and nullable under initSchema, so an insert that omitted
 * water_goal_glasses 500'd with `23502` for production users and passed every dev test.
 * So compare the full column definition, not just its name.
 *
 * Usage:
 *   MIGRATED_DATABASE_URL=... INIT_DATABASE_URL=... node scripts/check-schema-drift.mjs
 *
 * Both databases must already be built: run `npm run migrate:up` against the first and
 * `initSchema()` against the second (see scripts/run-init-schema.ts). The `migrations` CI
 * job does exactly that and then runs this.
 */
import pg from 'pg';

// node-pg-migrate's own bookkeeping table; only ever exists on the migrated database.
const IGNORED_TABLES = new Set(['pgmigrations']);

const COLUMNS_SQL = `
  SELECT table_name, column_name, is_nullable, data_type, udt_name, column_default,
         character_maximum_length, numeric_precision, numeric_scale
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, column_name
`;

/** `numeric(3,1)`, `varchar(255)`, `integer` -- precision is part of the contract too. */
function typeOf(row) {
  // data_type flattens every array to the literal 'ARRAY' and every enum/composite to
  // 'USER-DEFINED', which would make text[] and int[] compare equal. udt_name keeps the
  // element type (`_text`, `_int4`) and the enum's name.
  if (row.data_type === 'ARRAY' || row.data_type === 'USER-DEFINED') return row.udt_name;
  if (row.character_maximum_length != null) return `${row.data_type}(${row.character_maximum_length})`;
  // numeric_precision is also set for int/bigint, where it is implied by the type name.
  if (row.data_type === 'numeric' && row.numeric_precision != null) {
    return `${row.data_type}(${row.numeric_precision},${row.numeric_scale})`;
  }
  return row.data_type;
}

/** The attributes of a column that a write can trip over, as a comparable object. */
function definitionOf(row) {
  return {
    type: typeOf(row),
    nullable: row.is_nullable === 'YES',
    default: row.column_default ?? null,
  };
}

function describe(def) {
  return `${def.type}${def.nullable ? '' : ' NOT NULL'}${def.default === null ? '' : ` DEFAULT ${def.default}`}`;
}

async function columnsOf(connectionString) {
  const client = new pg.Client({ connectionString, ssl: false });
  await client.connect();
  try {
    const { rows } = await client.query(COLUMNS_SQL);
    return new Map(
      rows
        .filter((r) => !IGNORED_TABLES.has(r.table_name))
        .map((r) => [`${r.table_name}.${r.column_name}`, definitionOf(r)]),
    );
  } finally {
    await client.end();
  }
}

const migratedUrl = process.env.MIGRATED_DATABASE_URL;
const initUrl = process.env.INIT_DATABASE_URL;
if (!migratedUrl || !initUrl) {
  console.error('Set MIGRATED_DATABASE_URL and INIT_DATABASE_URL.');
  process.exit(2);
}

const [migrated, init] = await Promise.all([columnsOf(migratedUrl), columnsOf(initUrl)]);

const missingFromMigrations = [...init.keys()].filter((c) => !migrated.has(c)).sort();
const missingFromInitSchema = [...migrated.keys()].filter((c) => !init.has(c)).sort();

// Columns both paths create, but define differently.
const mismatched = [...migrated.keys()]
  .filter((c) => init.has(c))
  .map((c) => [c, migrated.get(c), init.get(c)])
  .filter(([, m, i]) => describe(m) !== describe(i))
  .sort(([a], [b]) => a.localeCompare(b));

if (missingFromMigrations.length) {
  console.error('\nDeclared by src/db/schema.ts but MISSING from migrations/');
  console.error('  -> a production deploy (initSchema skipped) will not have these:');
  for (const c of missingFromMigrations) console.error(`     ${c}`);
  console.error('  Fix: add a migration.');
}

if (missingFromInitSchema.length) {
  console.error('\nCreated by migrations/ but MISSING from src/db/schema.ts');
  console.error('  -> a dev database bootstrapped on startup will not have these:');
  for (const c of missingFromInitSchema) console.error(`     ${c}`);
  console.error('  Fix: add the table/column to initSchema (ADD COLUMN IF NOT EXISTS for');
  console.error('  columns on tables that already exist -- CREATE TABLE IF NOT EXISTS is a');
  console.error('  no-op on databases that predate them).');
}

if (mismatched.length) {
  console.error('\nDefined differently by migrations/ and src/db/schema.ts');
  console.error('  -> queries still compile, so this surfaces as a write that works in dev');
  console.error('     and fails in production (or the reverse):');
  for (const [column, m, i] of mismatched) {
    console.error(`     ${column}`);
    console.error(`       migrations/    ${describe(m)}`);
    console.error(`       schema.ts      ${describe(i)}`);
  }
  console.error('  Fix: migrations/ is what production runs, so it is the source of truth --');
  console.error('  bring schema.ts in line, and add a migration when the intended contract is');
  console.error('  the tighter one (backfill first; SET NOT NULL fails on existing NULLs).');
}

const drifted = missingFromMigrations.length + missingFromInitSchema.length + mismatched.length;
if (drifted) {
  console.error(`\nSchema drift: ${drifted} column(s).`);
  process.exit(1);
}

console.log(`No schema drift. Both bootstrap paths agree on ${migrated.size} columns.`);
