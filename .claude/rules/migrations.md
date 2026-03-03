# Migration Rules

Rules for files in `backend/migrations/**`

## File Naming

Format: `{timestamp}_{descriptive-name}.js`

Example: `1709234567890_add-users-table.js`

## Migration Structure

```javascript
export const shorthands = undefined;

export async function up(pgm) {
  // Apply changes
}

export async function down(pgm) {
  // Revert changes
}
```

## Common Operations

### Create Table
```javascript
export async function up(pgm) {
  pgm.createTable('items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    name: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  
  pgm.createIndex('items', 'user_id');
}

export async function down(pgm) {
  pgm.dropTable('items');
}
```

### Add Column
```javascript
export async function up(pgm) {
  pgm.addColumn('users', {
    subscription_status: { type: 'varchar(50)', default: 'free' },
  });
}

export async function down(pgm) {
  pgm.dropColumn('users', 'subscription_status');
}
```

### Add Index
```javascript
export async function up(pgm) {
  pgm.createIndex('transactions', ['user_id', 'date']);
}

export async function down(pgm) {
  pgm.dropIndex('transactions', ['user_id', 'date']);
}
```

### Raw SQL
```javascript
export async function up(pgm) {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS vector;
    ALTER TABLE items ADD COLUMN embedding vector(768);
  `);
}
```

## Required Practices

- Always write a `down` function
- Use `pgm.sql()` for complex operations
- Add indexes for foreign keys
- Use `timestamptz` for timestamps
- Use `uuid` for primary keys
- Add `created_at` and `updated_at` to most tables

## Forbidden

- Destructive changes without backup plan
- Dropping columns with data (add deprecation first)
- Long-running locks on large tables
- Schema changes that break running code

## Testing Migrations

```bash
# Apply
npm run migrate:up

# Verify
npm run migrate:up -- --dry-run

# Rollback
npm run migrate:down

# Test both directions
npm run migrate:down && npm run migrate:up
```
