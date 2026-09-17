export const shorthands = undefined;

/**
 * The user's measurement system, so the server knows which of its stored weights are actually
 * in pounds.
 *
 * `getWeightUnit` relabels `kg` to `lbs` and converts nothing (there is no conversion anywhere
 * in this repo), and the same label sits above the weight input on both clients — so an
 * imperial user types a pound number into a field
 * `agent-os/standards/global/domain-conventions.md` defines as kilograms, and it is stored
 * raw. Fixing that needs a migration over existing rows, and until now the information to
 * write one did not exist server-side at all: `units` lived only in device-local storage
 * (`trackvibe_settings`), so there was no column to query and no way to tell an
 * already-pounds row from a genuine kilograms one.
 *
 * **Deliberately nullable, with no default.** A default of `'metric'` would assert something
 * about every existing row that nobody has checked, and would erase the distinction the
 * eventual migration depends on. `NULL` means "this account has never told us", which is the
 * honest state of every row today and the one a backfill needs to be able to find.
 *
 * This column changes no behaviour on its own. It exists so the decision becomes possible.
 */
export const up = (pgm) => {
  // The CHECK rides along on ADD COLUMN rather than as a separate ADD CONSTRAINT: Postgres has
  // no `ADD CONSTRAINT IF NOT EXISTS`, and `IF NOT EXISTS` on the column makes the whole
  // statement a no-op on a re-run. A CHECK passes when it evaluates to NULL, so this permits
  // the null state above without spelling it out.
  pgm.sql(
    "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS units text " +
      "CHECK (units IN ('metric', 'imperial'))"
  );
};

export const down = (pgm) => {
  pgm.sql('ALTER TABLE user_profiles DROP COLUMN IF EXISTS units');
};
