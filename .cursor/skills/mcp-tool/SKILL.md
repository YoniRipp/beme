---
name: mcp-tool
description: Add new tools and resources to the BMe MCP server. Use this skill when extending MCP capabilities for Cursor or Claude Code integration.
---

# MCP Tool Skill

This skill helps you extend the BMe MCP server with new tools and resources.

## When to Use

- Adding new MCP tools for AI assistants
- Creating MCP resources for data access

## MCP Server Location

`backend/mcp-server/index.js`

## Adding a Tool

```javascript
server.tool(
  'tool_name',
  'Description of what it does',
  z.object({
    param1: z.string().describe('Parameter description'),
    param2: z.number().optional(),
  }),
  async ({ param1, param2 }) => {
    const result = await apiPost('/api/endpoint', { param1, param2 });
    return textContent(JSON.stringify(result, null, 2));
  }
);
```

## Example: Add Workout Tool

```javascript
server.tool(
  'add_workout',
  'Log a workout.',
  z.object({
    title: z.string(),
    type: z.enum(['strength', 'cardio', 'flexibility', 'sports']),
    durationMinutes: z.number().optional(),
  }),
  async ({ title, type, durationMinutes }) => {
    const result = await apiPost('/api/workouts', {
      title,
      type,
      durationMinutes: durationMinutes ?? 30,
    });
    return textContent(JSON.stringify(result, null, 2));
  }
);
```

## Adding a Resource

```javascript
server.resource(
  'resource_name',
  'beme://path/to/resource',
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

## Helpers Available

```javascript
apiGet(path)        // GET request
apiPost(path, body) // POST request
apiDelete(path)     // DELETE request
textContent(text)   // Wrap text for MCP response
```

## Testing

Restart Cursor after changes, then ask AI to use the new tool.
