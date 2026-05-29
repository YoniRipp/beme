/**
 * TrackVibe Ops Copilot — multi-agent orchestrator (CLI prototype).
 *
 * Architecture:
 *   You (admin)  ->  Supervisor agent (LangGraph ReAct)
 *                       routes to specialist department agents (as tools)
 *                       -> each department agent uses a subset of the
 *                          read-only ops MCP tools
 *                       -> ops MCP server (MCP_OPS_MODE) -> admin API -> Postgres
 *
 * The supervisor decides which departments to consult, then composes one answer.
 */
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env") });

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { buildDepartmentTools, SUPERVISOR_PROMPT } from "./ops-agents.js";

const MCP_SERVER_PATH = resolve(__dirname, "..", "backend", "mcp-server", "index.js");

/** Pull the names of department agents the supervisor invoked, for transparency. */
function consultedAgents(messages: unknown[]): string[] {
  const names = new Set<string>();
  for (const m of messages) {
    if (m instanceof AIMessage && Array.isArray(m.tool_calls)) {
      for (const call of m.tool_calls) if (call.name) names.add(call.name);
    }
  }
  return [...names];
}

async function main() {
  if (!process.env.GOOGLE_API_KEY) {
    console.error("Error: GOOGLE_API_KEY not set. Copy .env.example to .env and add your Gemini API key.");
    process.exit(1);
  }

  console.log("Starting Ops Copilot (connecting to ops MCP server)...");

  const client = new MultiServerMCPClient({
    trackvibe_ops: {
      command: "node",
      args: [MCP_SERVER_PATH],
      transport: "stdio" as const,
      env: {
        TRACKVIBE_API_URL: process.env.TRACKVIBE_API_URL || "http://localhost:3000",
        TRACKVIBE_MCP_TOKEN: process.env.TRACKVIBE_MCP_TOKEN || "",
        MCP_OPS_MODE: "true",
      },
    },
  });

  try {
    const allTools = await client.getTools();
    const opsTools = allTools.filter((t) => t.name.includes("ops_"));
    console.log(`Loaded ${opsTools.length} ops tools: ${opsTools.map((t) => t.name).join(", ")}`);

    const llm = new ChatGoogleGenerativeAI({ model: "gemini-2.5-flash", temperature: 0 });

    const departmentTools = buildDepartmentTools(llm, opsTools);
    console.log(`Built ${departmentTools.length} department agents: ${departmentTools.map((t) => t.name).join(", ")}`);

    const supervisor = createReactAgent({ llm, tools: departmentTools });

    console.log("\n--- TrackVibe Ops Copilot ---");
    console.log('Ask anything about your app. Type "quit" to exit.\n');
    console.log("Try:");
    console.log('  "How is the app doing overall this week?"');
    console.log('  "Which features are barely used?"');
    console.log('  "What is breaking right now?"');
    console.log('  "How healthy is trainer retention?"');
    console.log("");

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ask = (): Promise<string> =>
      new Promise((res) => rl.question("Admin: ", (a) => res(a)));

    while (true) {
      const input = (await ask()).trim();
      if (!input) continue;
      if (["quit", "exit", "q"].includes(input.toLowerCase())) break;

      try {
        const result = await supervisor.invoke({
          messages: [new SystemMessage(SUPERVISOR_PROMPT), new HumanMessage(input)],
        });
        const consulted = consultedAgents(result.messages);
        const last = result.messages[result.messages.length - 1];
        const answer = typeof last.content === "string" ? last.content : JSON.stringify(last.content);
        if (consulted.length) console.log(`\n[consulted: ${consulted.join(", ")}]`);
        console.log(`\nCopilot: ${answer}\n`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`\nError: ${message}\n`);
      }
    }

    rl.close();
  } finally {
    await client.close();
    console.log("Goodbye!");
  }
}

main().catch(console.error);
