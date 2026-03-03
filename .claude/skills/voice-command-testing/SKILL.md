---
name: voice-command-testing
description: Test voice commands against the BMe voice system. Use this skill when debugging voice input issues, validating Gemini function calls, or ensuring voice commands create the correct actions.
---

# Voice Command Testing Skill

This skill helps you test and debug the BMe voice command system.

## When to Use

- User reports voice command not working correctly
- Need to verify Gemini returns correct function calls
- Testing new voice prompt changes
- Debugging action execution issues

## Voice System Architecture

```
User Speech → Transcript → Gemini → Function Calls → Actions → Executor → Database
```

### Key Files

1. **`backend/voice/tools.js`** - Gemini function declarations (schema)
2. **`backend/src/services/voice.ts`** - VOICE_PROMPT and action building
3. **`backend/src/services/voiceExecutor.ts`** - Action execution

## Testing Process

### 1. Check the VOICE_PROMPT

Read `backend/src/services/voice.ts` and find `VOICE_PROMPT`. Ensure it has instructions for the user's scenario.

### 2. Verify Function Declarations

Check `backend/voice/tools.js` for the relevant function (e.g., `add_workout`, `add_schedule`). Verify parameters match what Gemini should return.

### 3. Test with API

Use the MCP tool or API directly:

```bash
curl -X POST http://localhost:3000/api/voice/understand \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"transcript": "I walked from 10 to 12"}'
```

### 4. Check Action Building

In `voice.ts`, find the handler for the action type (e.g., `buildAddWorkout`). Verify it correctly processes Gemini's args.

### 5. Check Execution

In `voiceExecutor.ts`, find the `case` for the action type. Verify it creates the correct database entry.

## Common Issues

### Missing Schedule for Workouts with Time

**Symptom**: User says "walked from 10 to 12", workout is created but no schedule entry.

**Cause**: VOICE_PROMPT doesn't instruct Gemini to call both `add_workout` AND `add_schedule`.

**Fix**: Add to VOICE_PROMPT:
```
Workouts with time: When the user says they did a workout WITH a time range 
(e.g. "walked from 10 to 12", "ran 6-7am"), call BOTH add_workout AND 
add_schedule (category "Exercise", title = workout name, startTime/endTime).
```

### Action Generated But Not Executed

**Symptom**: Logs show action was generated but result shows failure.

**Check**:
1. Is `config.voiceExecuteOnServer` true?
2. Does the executor have a case for this action type?
3. Is the action schema valid (check Zod validation)?

### Gemini Returns Wrong Function

**Symptom**: User says one thing, Gemini calls different function.

**Fix**: Update VOICE_PROMPT with clearer examples for the scenario.

## Debugging Commands

### Add Instrumentation

Add temporary logging to trace the flow:

```typescript
// In voice.ts processGeminiResponse
console.log('Function calls:', functionCalls.map(fc => fc.name));

// In voiceExecutor.ts executeActions
console.log('Executing actions:', actions.map(a => a.intent));
```

### Test Specific Phrases

Common test phrases:
- "I walked from 10 to 12" → should create workout + schedule
- "I ate pasta from 6 to 8" → should create food + schedule
- "I slept 7 hours" → should create sleep log
- "Bought coffee for 5" → should create transaction + food

## Validation Checklist

- [ ] VOICE_PROMPT has instructions for this scenario
- [ ] Function declaration exists in tools.js
- [ ] Handler exists in voice.ts HANDLERS object
- [ ] Executor has case in voiceExecutor.ts
- [ ] Database service method exists and works
