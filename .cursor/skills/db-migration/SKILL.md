---
name: db-migration
description: Generate database migrations for BMe using node-pg-migrate. Use this skill when creating new tables, adding columns, or modifying database schema.
---

# Database Migration Skill

This skill helps you create properly formatted node-pg-migrate migrations for BMe.

## When to Use

- Adding new database tables
- Adding/removing columns
- Creating indexes
- Modifying constraints
- Any schema changes

## Migration Location

All migrations live in: `backend/migrations/`

Naming convention: `{timestamp}_{description}.js`

Example: `1709234567890_add-user-preferences.js`

## Creating a Migration

### Step 1: Generate Migration File

```bash
cd backend
npm run migrate:create -- add_user_preferences
```

Or create manually with timestamp:

```javascript
// backend/migrations/{timestamp}_add-user-preferences.js
```

### Step 2: Write the Migration

Use this template:

```javascript
/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE user_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      theme VARCHAR(20) DEFAULT 'light',
      notifications_enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
  `);
};

/**
 * @type {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS user_preferences;
  `);
};
```

## Common Patterns

### Add Column

```javascript
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
  `);
};
```

### Add Index

```javascript
exports.up = (pgm) => {
  pgm.sql(`
    CREATE INDEX CONCURRENTLY idx_transactions_date 
    ON transactions(date);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_transactions_date;
  `);
};
```

## Running Migrations

```bash
cd backend

# Run all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Check migration status
npm run migrate:status
```

## Best Practices

1. **Always write down migrations** - Every up needs a corresponding down
2. **Use raw SQL** - `pgm.sql()` gives full control
3. **Add IF EXISTS/IF NOT EXISTS** - Makes migrations idempotent
4. **Use CONCURRENTLY for indexes** - Avoids table locks in production
5. **Test both directions** - Run up, then down, then up again
6. **Keep migrations small** - One logical change per file
7. **Never modify existing migrations** - Create new ones instead
