# Run Tests Command

Run tests for the current file or related tests.

## Usage

Invoke this command when you want to run tests for the code you're working on.

## Instructions

1. Determine the target based on the currently open file:
   - If editing a `.test.ts` file, run that specific test file
   - If editing a source file, look for a corresponding `.test.ts` file
   - If no specific file, run all tests

2. Run the appropriate test command:

```bash
# Backend tests
cd backend && npm test -- --run [test-file-pattern]

# Frontend tests  
cd frontend && npm test -- --run [test-file-pattern]

# All tests
cd backend && npm test && cd ../frontend && npm test
```

3. Report test results, including:
   - Number of tests passed/failed
   - Any error messages
   - Suggestions for fixing failures

## Examples

- Editing `backend/src/services/voice.ts` → Run `npm test -- --run voice`
- Editing `frontend/src/hooks/useSpeechRecognition.ts` → Run `npm test -- --run useSpeechRecognition`
- No file context → Run all tests
