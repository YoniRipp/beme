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
 * bootstrapped dev database — which means an account-deletion test written against dev
 * exercised a foreign-key topology production does not have.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const schemaSource = read('./schema.ts');
const migrationSource = read('../../migrations/1776000000000_cascade-user-delete-fks.js');

/** Parses a `['table', 'column', 'ACTION'],` list out of either file. */
function parseFkList(source: string, constName: string): [string, string, string][] {
  const start = source.indexOf(constName);
  expect(start, `${constName} not found`).toBeGreaterThan(-1);
  const body = source.slice(start, source.indexOf('];', start));
  return [...body.matchAll(/\[\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\s*\]/g)].map(
    (m) => [m[1], m[2], m[3]] as [string, string, string],
  );
}

const schemaActions = parseFkList(schemaSource, 'USER_FK_ACTIONS');
const migrationTargets = parseFkList(migrationSource, 'FK_TARGETS');

describe('src/db/schema.ts vs. the cascade migration', () => {
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
