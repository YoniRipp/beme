export const shorthands = undefined;

/**
 * The unit a weight row is actually in, so a stored number stops being ambiguous.
 *
 * Until now `weight_entries.weight` was a bare `numeric` that the domain defines as
 * kilograms (`agent-os/standards/global/domain-conventions.md`) while `getWeightUnit`
 * relabelled the field to `lbs` for imperial users without converting anything. So an
 * imperial user typed pounds into a kilograms column and it was stored raw, and every other
 * reader — the metric views, the charts, the MCP server, the AI paths — went on reading it
 * as kilograms. The number alone could not tell you which it was.
 *
 * With this column a row written from now on says what it means, and
 * `displayWeight(value, unit, system)` in `packages/shared` converts from the row's unit
 * rather than from the viewer's preference. That distinction is the whole safety argument:
 * converting on preference alone would have re-read every stored `135` as 297 lbs.
 *
 * **Nullable, with no default, for the same reason `units` on `user_profiles` is** (see
 * `1776600000000_add-user-profile-units.js`). A `DEFAULT 'kg'` would assert something about
 * every existing row that nobody has checked — some of them are pounds — and would erase the
 * distinction a backfill needs. `NULL` means "written before rows were tagged", which is the
 * honest state of all of them.
 *
 * Reading a NULL as kilograms is exactly what every consumer already does, so this
 * re-interprets nothing that exists. It makes new data correct and leaves the historical
 * question open, which is still the owner's to answer (`docs/HANDOFF.md`, "Needs the
 * owner") — but the rows to answer it about are now findable: `WHERE unit IS NULL`, joined
 * to `user_profiles.units`.
 */
export const up = (pgm) => {
  // The CHECK rides along on ADD COLUMN rather than as a separate ADD CONSTRAINT: Postgres
  // has no `ADD CONSTRAINT IF NOT EXISTS`, and `IF NOT EXISTS` on the column makes the whole
  // statement a no-op on a re-run. A CHECK passes when it evaluates to NULL, so this permits
  // the untagged state above without spelling it out.
  pgm.sql(
    "ALTER TABLE weight_entries ADD COLUMN IF NOT EXISTS unit text " +
      "CHECK (unit IN ('kg', 'lbs'))"
  );
};

export const down = (pgm) => {
  pgm.sql('ALTER TABLE weight_entries DROP COLUMN IF EXISTS unit');
};
