/**
 * Add phone_number column to users table for WhatsApp integration.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number text UNIQUE;`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone_number) WHERE phone_number IS NOT NULL;`);
};

export const down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_users_phone;`);
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS phone_number;`);
};
