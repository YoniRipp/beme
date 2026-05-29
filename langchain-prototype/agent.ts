import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env") });

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";
import { customTools } from "./tools.js";

const MCP_SERVER_PATH = resolve(__dirname, "..", "backend", "mcp-server", "index.js");

async function main() {
  if (!process.env.GOOGLE_API_KEY) {
    console.error("Error: GOOGLE_API_KEY not set. Copy .env.example to .env and add your Gemini API key.");
    process.exit(1);
  }

  console.log("Starting MCP client...");

  const client = new MultiServerMCPClient({
    trackvibe: {
      command: "node",
      args: [MCP_SERVER_PATH],
      transport: "stdio" as const,
      env: {
        TRACKVIBE_API_URL: process.env.TRACKVIBE_API_URL || "http://localhost:3000",
        TRACKVIBE_MCP_TOKEN: process.env.TRACKVIBE_MCP_TOKEN || "",
      },
    },
  });

  try {
    const mcpTools = await client.getTools();
    console.log(`Loaded ${mcpTools.length} MCP tools: ${mcpTools.map((t) => t.name).join(", ")}`);
    console.log(`Plus ${customTools.length} custom tool(s): ${customTools.map((t) => t.name).join(", ")}`);

    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0,
    });

    const allTools = [...mcpTools, ...customTools];

    const agent = createReactAgent({
      llm,
      tools: allTools,
    });

    console.log("\n--- TrackVibe AI Assistant ---");
    console.log('Type your message and press Enter. Type "quit" to exit.\n');
    console.log("Try:");
    console.log('  "What are my current goals?"');
    console.log('  "Log 2 eggs and toast for breakfast"');
    console.log('  "How much water have I had today?"');
    console.log('  "Add a glass of water"');
    console.log('  "Show my workouts"');
    console.log('  "Calculate macros for 30g protein, 50g carbs, 15g fat"');
    console.log("");

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = (): Promise<string> =>
      new Promise((resolve) => {
        rl.question("You: ", (answer) => resolve(answer));
      });

    while (true) {
      const userInput = await askQuestion();
      const trimmed = userInput.trim();

      if (!trimmed) continue;
      if (["quit", "exit", "q"].includes(trimmed.toLowerCase())) break;

      try {
        const response = await agent.invoke({
          messages: [new HumanMessage(trimmed)],
        });

        const lastMessage = response.messages[response.messages.length - 1];
        console.log(`\nAssistant: ${lastMessage.content}\n`);
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
