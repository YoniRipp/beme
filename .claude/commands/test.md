# /test Command

Run tests for the current context.

## Description

Runs relevant tests based on the current file or directory you're working in.

## Behavior

1. **If a specific file is in context:**
   - Look for a corresponding `.test.ts` file
   - Run: `npm test -- --run <pattern>`

2. **If a directory is in context:**
   - Run all tests in that directory
   - Run: `npm test -- --run <directory>`

3. **If no specific context:**
   - Run all tests
   - Run: `npm test`

## Commands

### Backend Tests
```bash
cd backend && npm test -- --run <pattern>
```

### Frontend Tests
```bash
cd frontend && npm test -- --run <pattern>
```

### All Tests
```bash
cd backend && npm test && cd ../frontend && npm test
```

## Output

Report:
- Test summary (passed/failed/skipped)
- Error details for failures
- Suggestions for fixing issues

## Examples

```
/test voice.ts        → Runs voice.test.ts
/test services/       → Runs all service tests
/test                 → Runs all tests
```
