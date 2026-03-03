---
name: mcp-tool
description: Add new tools and resources to the BMe MCP server. Use this skill when extending MCP capabilities for Cursor or Claude Code integration.
---

# MCP Tool Skill

This skill helps you extend the BMe MCP server with new tools and resources.

## When to Use

- Adding new MCP tools for AI assistants
- Creating MCP resources for data access
- Extending existing MCP functionality

## MCP Server Location

The BMe MCP server is at: `backend/mcp-server/index.js`

## Adding a New Tool

### Tool Template

```javascript
server.tool(
  'tool_name',                    // Unique tool name (snake_case)
  'Description of what it does',  // Shown to AI when selecting tools
  z.object({                      // Zod schema for parameters
    param1: z.string().describe('Parameter description'),
    param2: z.number().optional().describe('Optional number'),
    param3: z.enum(['a', 'b']).describe('Must be a or b'),
  }),
  async ({ param1, param2, param3 }) => {
    // Implementation
    const result = await apiPost('/api/endpoint', { param1, param2, param3 });
    return textContent(JSON.stringify(result, null, 2));
  }
);
```

### Example: Add Workout Tool

```javascript
server.tool(
  'add_workout',
  'Log a workout with optional exercises.',
  z.object({
    title: z.string().describe('Workout name'),
    type: z.enum(['strength', 'cardio', 'flexibility', 'sports']).describe('Workout type'),
    durationMinutes: z.number().optional().describe('Duration in minutes'),
    date: z.string().optional().describe('YYYY-MM-DD, defaults to today'),
    exercises: z.array(z.object({
      name: z.string(),
      sets: z.number(),
      reps: z.number(),
      weight: z.number().optional(),
    })).optional().describe('List of exercises for strength workouts'),
  }),
  async ({ title, type, durationMinutes, date, exercises }) => {
    const result = await apiPost('/api/workouts', {
      title,
      type,
      durationMinutes: durationMinutes ?? 30,
      date: date ?? new Date().toISOString().slice(0, 10),
      exercises: exercises ?? [],
    });
    return textContent(JSON.stringify(result, null, 2));
  }
);
```

### Example: List Tool

```javascript
server.tool(
  'list_workouts',
  'List logged workouts. Optional date range.',
  z.object({
    startDate: z.string().optional().describe('YYYY-MM-DD'),
    endDate: z.string().optional().describe('YYYY-MM-DD'),
    limit: z.number().optional().describe('Max results'),
  }),
  async ({ startDate, endDate, limit } = {}) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (limit) params.set('limit', String(limit));
    
    const queryStr = params.toString();
    const path = '/api/workouts' + (queryStr ? '?' + queryStr : '');
    const items = await apiGet(path);
    return textContent(JSON.stringify(items, null, 2));
  }
);
```

### Example: Delete Tool

```javascript
server.tool(
  'delete_workout',
  'Remove a workout by ID.',
  z.object({
    id: z.string().describe('Workout ID (UUID)'),
  }),
  async ({ id }) => {
    await apiDelete(`/api/workouts/${id}`);
    return textContent('Deleted.');
  }
);
```

## Adding a New Resource

Resources provide read-only data access.

### Resource Template

```javascript
server.resource(
  'resource_name',              // Unique resource name
  'beme://path/to/resource',    // URI scheme
  { title: 'Human-readable title' },
  async (uri) => {
    const data = await apiGet('/api/endpoint');
    return {
      contents: [{
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  }
);
```

### Example: Today's Workouts Resource

```javascript
server.resource(
  'workouts_today',
  'beme://workouts/today',
  { title: "Today's workouts" },
  async (uri) => {
    const today = new Date().toISOString().slice(0, 10);
    const items = await apiGet(`/api/workouts?date=${today}`);
    return {
      contents: [{
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(items, null, 2),
      }],
    };
  }
);
```

### Example: Daily Summary Resource

```javascript
server.resource(
  'daily_summary',
  'beme://summary/today',
  { title: "Today's summary (workouts, food, schedule)" },
  async (uri) => {
    const today = new Date().toISOString().slice(0, 10);
    
    const [workouts, food, schedule] = await Promise.all([
      apiGet(`/api/workouts?date=${today}`),
      apiGet(`/api/food-entries?date=${today}`),
      apiGet('/api/schedule'),
    ]);
    
    const summary = {
      date: today,
      workouts: workouts.length,
      totalCalories: food.reduce((sum, f) => sum + (f.calories || 0), 0),
      scheduleItems: schedule.length,
      details: { workouts, food, schedule },
    };
    
    return {
      contents: [{
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(summary, null, 2),
      }],
    };
  }
);
```

## Helper Functions

The MCP server has these helpers:

```javascript
// GET request
async function apiGet(path) {
  const res = await fetch(`${BEME_API_URL}${path}`, { headers: authHeaders });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

// POST request
async function apiPost(path, body) {
  const res = await fetch(`${BEME_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

// DELETE request
async function apiDelete(path) {
  const res = await fetch(`${BEME_API_URL}${path}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  if (!res.ok) throw new Error(res.statusText);
}

// Text content wrapper
function textContent(text) {
  return { content: [{ type: 'text', text }] };
}
```

## Zod Schema Patterns

```javascript
// Required string
z.string()

// Optional with default
z.string().optional().default('default value')

// Enum
z.enum(['option1', 'option2', 'option3'])

// Number with constraints
z.number().min(0).max(100)

// Date string
z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('YYYY-MM-DD')

// Array
z.array(z.string())

// Nested object
z.object({
  name: z.string(),
  value: z.number(),
})

// Union types
z.union([z.string(), z.number()])
```

## Testing MCP Tools

Use the MCP inspector or call via Cursor:

1. Restart Cursor to reload MCP config
2. Ask the AI to use the new tool
3. Check server logs for errors

Or test manually:

```bash
echo '{"method": "tools/call", "params": {"name": "add_workout", "arguments": {"title": "Morning Run", "type": "cardio"}}}' | node backend/mcp-server/index.js
```

## MCP Configuration

The MCP server is configured in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "beme": {
      "command": "node",
      "args": ["backend/mcp-server/index.js"],
      "cwd": "d:/Downloads/Git/BMe",
      "env": {
        "BEME_API_URL": "http://localhost:3000",
        "BEME_MCP_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Best Practices

1. **Descriptive names**: Use clear, action-oriented names (e.g., `add_workout`, `list_transactions`)
2. **Good descriptions**: Help AI understand when to use each tool
3. **Parameter descriptions**: Describe expected format and constraints
4. **Error handling**: Catch and return meaningful errors
5. **Single responsibility**: One tool per operation
6. **Consistent responses**: Always return JSON for complex data
