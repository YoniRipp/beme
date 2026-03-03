# /db-reset Command

Reset database to clean state.

## Description

Rolls back all migrations and re-applies them, optionally seeding with test data.

## Warning

This command will DELETE all data in the database. Only use in development.

## Commands

### Full Reset
```bash
cd backend

# Drop all tables (via migrations)
npm run migrate:down -- --count 999

# Re-apply all migrations
npm run migrate:up

# Seed data (if seed script exists)
npm run seed
```

### Quick Reset (if script exists)
```bash
cd backend && npm run db:reset
```

## Steps

1. Confirm this is a development environment
2. Roll back all migrations
3. Apply all migrations fresh
4. Run seed script if available
5. Report final state

## Safety Checks

Before executing:
- Verify `NODE_ENV` is not `production`
- Confirm user intent
- Check for seed script availability

## Output Format

```
Database Reset
==============
Environment: development
Database: beme_dev

Rolling back migrations... ✓ (15 migrations)
Applying migrations... ✓ (15 migrations)
Seeding data... ✓

Database reset complete.
Tables: 12
Seed records: 50
```

## Troubleshooting

### Migration fails
- Check for syntax errors in migration files
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running

### Seed fails
- Check seed script exists
- Verify seed data matches current schema
- Check for foreign key constraints

## Related Commands

- `npm run migrate:up` - Apply pending migrations
- `npm run migrate:down` - Rollback last migration
- `npm run migrate:create -- name` - Create new migration
