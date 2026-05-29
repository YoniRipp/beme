# TrackVibe LangChain.js Prototype

This is a learning prototype that demonstrates how to wire together LangChain.js, the Model Context Protocol (MCP), LangGraph's ReAct agent, and Google Gemini into an interactive CLI assistant. It connects to the TrackVibe MCP server over stdio, loads its tools automatically, and combines them with custom native LangChain tools so you can chat with your fitness data from the terminal.

## Concepts Demonstrated

- **MCP stdio transport** -- spawning a local MCP server as a child process and communicating over stdin/stdout
- **langchain-mcp-adapters** -- using `MultiServerMCPClient` to convert MCP tools into LangChain-compatible tools
- **LangGraph ReAct agent** -- a reasoning + acting loop that decides when to call tools and how to synthesize results
- **Custom tools alongside MCP tools** -- mixing hand-written `DynamicStructuredTool` instances with auto-discovered MCP tools
- **Async agent invocation** -- streaming messages through the LangGraph agent runtime
- **Multi-server MCP support** -- the client config supports multiple named MCP servers (only one is used here, but the pattern scales)

## Prerequisites

- Node.js 18+
- A Google Gemini API key (get one at https://aistudio.google.com/app/apikey)
- TrackVibe backend running on `localhost:3000`

## Setup

```bash
cd langchain-prototype

# Install dependencies
npm install

# Create your environment file
cp .env.example .env

# Edit .env and add your Gemini API key
```

## Run

```bash
npm start
# or directly:
npx tsx agent.ts
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CLI (readline)                                                 │
│    │                                                            │
│    v                                                            │
│  LangGraph ReAct Agent                                          │
│    │                                                            │
│    ├──> Gemini 2.5 Flash (reasoning + tool selection)           │
│    │                                                            │
│    ├──> Custom Tools                                            │
│    │      └── calculate_macros                                  │
│    │                                                            │
│    └──> MCP Client (langchain-mcp-adapters)                     │
│           │                                                     │
│           │ stdio                                                │
│           v                                                     │
│         Node.js MCP Server (backend/mcp-server/index.js)        │
│           │                                                     │
│           │ HTTP                                                 │
│           v                                                     │
│         Express API (localhost:3000)                             │
│           │                                                     │
│           v                                                     │
│         PostgreSQL                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Swapping the LLM

### Switch to Claude (Anthropic)

```typescript
// 1. Install: npm install @langchain/anthropic
// 2. Change the import:
import { ChatAnthropic } from "@langchain/anthropic";

// 3. Replace the llm initialization:
const llm = new ChatAnthropic({
  model: "claude-sonnet-4-20250514",
  temperature: 0,
});

// 4. Set ANTHROPIC_API_KEY in your .env instead of GOOGLE_API_KEY
```

### Switch to OpenAI

```typescript
// 1. Install: npm install @langchain/openai
// 2. Change the import:
import { ChatOpenAI } from "@langchain/openai";

// 3. Replace the llm initialization:
const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
});

// 4. Set OPENAI_API_KEY in your .env instead of GOOGLE_API_KEY
```

## Ops Copilot — multi-agent orchestrator (`npm run ops`)

A second entry point (`ops.ts`) demonstrates a **multi-agent** system on top of the
same MCP machinery: a **supervisor** agent that routes admin questions to five
specialist **department agents**, each scoped to a subset of read-only analytics
tools. This is the agentic pattern you'd use for a company-wide "ask the data"
copilot.

```
Admin question
   │
   ▼
Supervisor agent (LangGraph ReAct)          ← decides which departments to consult
   ├──> consult_users_agent                 → ops_business_overview, ops_search_users
   ├──> consult_usage_agent                 → ops_runtime_metrics, ops_activity
   ├──> consult_bugs_agent                  → ops_error_logs, ops_action_logs, ops_runtime_metrics
   ├──> consult_app_retention_agent         → ops_business_overview, ops_activity
   └──> consult_trainer_retention_agent     → ops_business_overview, ops_activity
                       │
                       ▼  (each department agent = its own ReAct agent)
            Ops MCP tools  (MCP_OPS_MODE, read-only)
                       │ stdio → HTTP
            Admin API (/api/admin/stats, /metrics, /logs, /activity) → PostgreSQL
```

Key ideas demonstrated:
- **Supervisor / orchestrator** routing to specialists
- **Agents-as-tools** — each department agent is wrapped as a `DynamicStructuredTool`
- **Tool scoping** — every department only sees the tools its domain needs
- **Read-only, admin-scoped data access** via the `MCP_OPS_MODE` toolset

### Run the Ops Copilot

The ops MCP tools wrap **admin** endpoints, so the MCP user must be an **admin**:
set the backend's `TRACKVIBE_MCP_USER_ID` to an admin user's id (and
`TRACKVIBE_MCP_SECRET` / `TRACKVIBE_MCP_TOKEN` as usual). Then:

```bash
npm run ops
```

Example questions:
```
Admin: How is the app doing overall this week?
Admin: Which features or endpoints are barely used?
Admin: What's breaking right now?
Admin: How healthy is trainer retention?
```

> Note: the agents only use data the existing admin endpoints already expose.
> Precise per-cohort retention curves would require additional backend
> aggregation endpoints (a natural next step).

## Example Conversations

```
You: What are my current goals?
Assistant: You have 2 goals set up:
  1. Calories -- target 2000 kcal per day
  2. Workouts -- target 4 sessions per week

You: Calculate macros for 30g protein, 50g carbs, 15g fat
Assistant: Here is the breakdown:
  Total: 455 calories
  Protein: 30g = 120 cal (26%)
  Carbs:   50g = 200 cal (44%)
  Fat:     15g = 135 cal (30%)

You: Add a goal to drink 8 glasses of water daily
Assistant: I have added a new goal: Water -- target 8 glasses per day.

You: quit
Goodbye!
```
