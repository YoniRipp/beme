# /lint-fix Command

Run linter and automatically fix issues.

## Description

Runs ESLint with auto-fix enabled to clean up code style issues.

## Commands

### Backend
```bash
cd backend && npm run lint -- --fix
```

### Frontend
```bash
cd frontend && npm run lint -- --fix
```

### Both
```bash
cd backend && npm run lint -- --fix && cd ../frontend && npm run lint -- --fix
```

## Behavior

1. Run the linter with `--fix` flag
2. Report which files were modified
3. List any remaining errors that couldn't be auto-fixed
4. Suggest manual fixes for remaining issues

## Auto-fixable Issues

- Formatting (spacing, quotes, semicolons)
- Import ordering
- Unused imports removal
- Simple type annotations

## Non-auto-fixable Issues

- `any` types (requires manual type definition)
- Unused variables (might be intentional)
- Complex type errors
- Logic errors

## Output Format

```
Lint Fix Results
================
Fixed: 5 files
Remaining errors: 2

Remaining issues:
- src/services/voice.ts:45 - 'any' type usage
- src/utils/helpers.ts:12 - Unused variable 'temp'
```

## Tips

- Run before committing code
- Fix remaining issues manually
- Use `// eslint-disable-next-line` sparingly and with comments
