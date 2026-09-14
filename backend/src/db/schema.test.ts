import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

const mockQuery = vi.fn();
const mockRelease = vi.fn();

vi.mock('./pool.js', () => ({
  getPool: () => ({ connect: async () => ({ query: mockQuery, release: mockRelease }) }),
}));
vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { initSchema } from './schema.js';

const readSource = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

/** Column names declared by a `CREATE TABLE ... ( ... )` block in schema.ts. */
function createdColumns(source: string, table: string): string[] {
  const body = new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\n\\s*\\);`).exec(source)?.[1];
  if (!body) throw new Error(`no CREATE TABLE for ${table} in schema.ts`);
  return body
    .split('\n')
    .map((line) => /^\s*([a-z_]+)\s/.exec(line)?.[1])
    .filter((name): name is string => Boolean(name) && !['unique', 'primary', 'constraint'].includes(name!));
}

/** Column names added by `ALTER TABLE <table> ADD COLUMN IF NOT EXISTS` blocks. */
function addedColumns(source: string, table: string): string[] {
  const blocks = source.matchAll(new RegExp(`ALTER TABLE ${table}([\\s\\S]*?);`, 'g'));
  return [...blocks].flatMap((block) =>
    [...block[1].matchAll(/ADD COLUMN IF NOT EXISTS (\w+)/g)].map((m) => m[1]),
  );
}

describe('initSchema', () => {
  beforeEach(() => {
    mockQuery.mockReset().mockResolvedValue({ rows: [] });
    mockRelease.mockReset();
  });

  // A failed statement poisons the whole transaction, so without a savepoint a database
  // without pgvector turns the final COMMIT into a rollback and every table above it is
  // silently discarded.
  it('still commits the core tables when pgvector is unavailable', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('CREATE EXTENSION IF NOT EXISTS vector')) {
        throw new Error('extension "vector" is not available');
      }
      return { rows: [] };
    });

    await initSchema();

    const statements = mockQuery.mock.calls.map(([sql]) => String(sql).trim());
    expect(statements).toContain('SAVEPOINT pgvector');
    expect(statements).toContain('ROLLBACK TO SAVEPOINT pgvector');
    expect(statements).toContain('COMMIT');
    expect(statements).not.toContain('ROLLBACK');
    expect(mockRelease).toHaveBeenCalled();
  });

  // schema.ts and migrations/ are two independent bootstrap paths. When they disagree on
  // the exercise catalog, GET /api/exercises fails outright ("column does not exist") and
  // the picker can only report it as an empty catalog.
  it('declares every exercise column the model selects', () => {
    const schema = readSource('./schema.ts');
    const model = readSource('../models/exercise.ts');

    const listColumns = /const LIST_COLUMNS = `([\s\S]*?)`/.exec(model)?.[1];
    expect(listColumns).toBeTruthy();
    const selected = listColumns!.split(',').map((c) => c.trim()).filter(Boolean);
    // DETAIL_COLUMNS is LIST_COLUMNS plus the step-by-step instructions.
    selected.push('instructions');

    const available = new Set([
      ...createdColumns(schema, 'exercises'),
      ...addedColumns(schema, 'exercises'),
    ]);

    expect([...selected].filter((c) => !available.has(c))).toEqual([]);
  });

  // The users(id) FK reconcile loop re-adds constraints on columns that a database
  // bootstrapped before those columns existed does not have -- `exercises.created_by` is
  // declared in the CREATE TABLE and never in an `ADD COLUMN IF NOT EXISTS` block, so on
  // such a database `ALTER TABLE exercises ADD CONSTRAINT ... (created_by)` raises 42703.
  // Without a savepoint that aborts the whole transaction and the final COMMIT silently
  // becomes a rollback, discarding every table the run created -- the same failure the
  // pgvector savepoint above exists to prevent.
  it('still commits when a foreign-key reconcile hits a column the database does not have', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (String(sql).includes('exercises_created_by_fkey')) {
        throw Object.assign(new Error('column "created_by" does not exist'), { code: '42703' });
      }
      return { rows: [] };
    });

    await initSchema();

    const statements = mockQuery.mock.calls.map(([sql]) => String(sql).trim());
    expect(statements).toContain('COMMIT');
    expect(statements).not.toContain('ROLLBACK');
    expect(statements.some((s) => s.startsWith('ROLLBACK TO SAVEPOINT user_fk'))).toBe(true);
  });

  it('reconciles the remaining foreign keys after one of them is skipped', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (String(sql).includes('exercises_created_by_fkey')) {
        throw Object.assign(new Error('column "created_by" does not exist'), { code: '42703' });
      }
      return { rows: [] };
    });

    await initSchema();

    const statements = mockQuery.mock.calls.map(([sql]) => String(sql));
    // `foods.verified_by` is reconciled after `exercises.created_by` in USER_FK_ACTIONS.
    expect(statements.some((s) => s.includes('foods_verified_by_fkey'))).toBe(true);
  });
});

/**
 * `src/db/schema.ts` (what a dev machine gets) against `migrations/` (what production gets).
 *
 * `check-schema-drift.mjs` compares two live databases and is the real gate, but it only
 * runs in the `migrations` CI job and needs both databases built. This is the cheap
 * always-on half: it reads the two files and fails when they disagree about which foreign
 * keys reference users(id) and what happens to them on delete.
 *
 * It exists because they *did* disagree. The cascade migration landed and schema.ts never
 * received it, so `DELETE FROM users` cascaded in production and raised 23503 in a freshly
 * bootstrapped dev database -- which means an account-deletion test written against dev
 * exercised a foreign-key topology production does not have.
 */
describe('src/db/schema.ts vs. the cascade migration', () => {
  /** Parses a `['table', 'column', 'ACTION'],` list out of either file. */
  function parseFkList(source: string, constName: string): [string, string, string][] {
    const start = source.indexOf(constName);
    expect(start, `${constName} not found`).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('];', start));
    return [...body.matchAll(/\[\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\s*\]/g)].map(
      (m) => [m[1], m[2], m[3]] as [string, string, string],
    );
  }

  const schemaSource = readSource('./schema.ts');
  const migrationSource = readSource('../../migrations/1776000000000_cascade-user-delete-fks.js');
  const schemaActions = parseFkList(schemaSource, 'USER_FK_ACTIONS');
  const migrationTargets = parseFkList(migrationSource, 'FK_TARGETS');

  it('declares the same users(id) foreign keys, with the same ON DELETE action', () => {
    const sortByKey = (rows: [string, string, string][]) =>
      [...rows].sort((a, b) => `${a[0]}.${a[1]}`.localeCompare(`${b[0]}.${b[1]}`));

    expect(sortByKey(schemaActions)).toEqual(sortByKey(migrationTargets));
  });

  it('covers every table the migration cascades, so no dev database blocks a delete', () => {
    expect(migrationTargets.length).toBeGreaterThan(0);
    expect(schemaActions.length).toBe(migrationTargets.length);
  });

  // CREATE TABLE IF NOT EXISTS is a no-op on a database that already has the table, so
  // declaring the right action in the CREATE alone leaves every previously bootstrapped dev
  // machine on the old actionless FK. The constraint has to be re-added explicitly.
  it('re-adds the constraints rather than trusting CREATE TABLE IF NOT EXISTS', () => {
    expect(schemaSource).toContain('ADD CONSTRAINT');
    expect(schemaSource).toMatch(/DROP CONSTRAINT/);
  });

  // Every inline `REFERENCES users(id)` in a CREATE TABLE has to state its action too, or a
  // brand-new dev database is born drifted even though the fixup pass above corrects it.
  it('leaves no users(id) reference without an explicit ON DELETE action', () => {
    const bare = [...schemaSource.matchAll(/REFERENCES users\(id\)(?! ON DELETE)/g)];
    expect(bare, 'a users(id) FK has no ON DELETE action').toHaveLength(0);
  });
});
