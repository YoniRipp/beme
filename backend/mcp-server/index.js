import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const TRACKVIBE_API_URL = process.env.TRACKVIBE_API_URL || 'http://localhost:3000';
const TRACKVIBE_MCP_TOKEN = process.env.TRACKVIBE_MCP_TOKEN;
const authHeaders = TRACKVIBE_MCP_TOKEN ? { Authorization: `Bearer ${TRACKVIBE_MCP_TOKEN}` } : {};

async function apiGet(path) {
  const res = await fetch(`${TRACKVIBE_API_URL}${path}`, { headers: authHeaders });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${TRACKVIBE_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(`${TRACKVIBE_API_URL}${path}`, { method: 'DELETE', headers: authHeaders });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText || `Request failed: ${res.status}`);
  }
  return null;
}

function textContent(text) {
  return { content: [{ type: 'text', text }] };
}

const server = new McpServer({
  name: 'trackvibe',
  version: '1.0.0',
});

// --- Tools ---

server.tool(
  'add_goal',
  'Add a goal.',
  z.object({
    type: z.enum(['calories', 'workouts', 'sleep']),
    target: z.number().min(0),
    period: z.enum(['weekly', 'monthly', 'yearly']),
  }),
  async (args) => {
    const result = await apiPost('/api/goals', args);
    return textContent(JSON.stringify(result, null, 2));
  }
);

server.tool(
  'list_goals',
  'List all goals.',
  z.object({}),
  async () => {
    const items = await apiGet('/api/goals');
    return textContent(JSON.stringify(items, null, 2));
  }
);

// --- Resources ---

server.resource(
  'goals',
  'trackvibe://goals',
  { title: 'Current goals' },
  async (uri) => {
    const items = await apiGet('/api/goals');
    return {
      contents: [{ uri: uri.toString(), mimeType: 'application/json', text: JSON.stringify(items, null, 2) }],
    };
  }
);

// --- Run ---

const transport = new StdioServerTransport();
await server.connect(transport);
