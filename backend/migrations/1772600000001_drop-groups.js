export const up = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS group_invitations CASCADE');
  pgm.sql('DROP TABLE IF EXISTS group_members CASCADE');
  pgm.sql('DROP TABLE IF EXISTS groups CASCADE');
};

export const down = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS groups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      description text,
      type text NOT NULL,
      created_at timestamptz DEFAULT now(),
      created_by uuid REFERENCES users(id)
    )
  `);
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS group_members (
      group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id),
      role text NOT NULL CHECK (role IN ('admin', 'member')),
      joined_at timestamptz DEFAULT now(),
      PRIMARY KEY (group_id, user_id)
    )
  `);
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)');
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS group_invitations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      email text NOT NULL,
      invited_by_user_id uuid NOT NULL REFERENCES users(id),
      invited_at timestamptz DEFAULT now()
    )
  `);
  pgm.sql('CREATE UNIQUE INDEX IF NOT EXISTS idx_group_invitations_group_email ON group_invitations (group_id, lower(email))');
};
