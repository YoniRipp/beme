# Database Migration Command

Run database migrations for the BMe backend.

## Usage

Invoke this command to apply pending database migrations or manage migration state.

## Instructions

1. Check for pending migrations:
```bash
cd backend && npm run migrate:up -- --dry-run
```

2. Apply migrations:
```bash
cd backend && npm run migrate:up
```

3. If rollback is needed:
```bash
cd backend && npm run migrate:down
```

## Common Tasks

### Apply all pending migrations
```bash
cd backend && npm run migrate:up
```

### Rollback last migration
```bash
cd backend && npm run migrate:down
```

### Create new migration
```bash
cd backend && npm run migrate:create -- descriptive_migration_name
```

### Check migration status
```bash
cd backend && npm run migrate:up -- --dry-run
```

## Troubleshooting

- If migrations fail, check `DATABASE_URL` is set correctly
- For connection issues, verify PostgreSQL is running
- Review migration file for syntax errors
- Check for conflicting schema changes

## Notes

- Migrations are located in `backend/migrations/`
- Always review migration files before applying
- Test migrations locally before production deployment
