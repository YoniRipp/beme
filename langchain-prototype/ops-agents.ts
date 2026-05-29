/**
 * Department ("domain") agents for the TrackVibe Ops Copilot.
 *
 * Each department is a LangGraph ReAct agent with:
 *   - a focused domain system prompt (its expertise + how to answer)
 *   - a SUBSET of the ops MCP tools (only the data its domain needs)
 *
 * Each agent is then wrapped as a single tool (`consult_*_agent`) so the
 * supervisor can call it like any other tool. This is the "agents-as-tools"
 * orchestration pattern: robust, debuggable, and version-stable.
 */
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool, type StructuredToolInterface } from "@langchain/core/tools";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { z } from "zod";

type McpTool = StructuredToolInterface;

/** Pick MCP tools whose name contains any of the given substrings (robust to
 *  server-name prefixing applied by the MCP adapter). */
function pick(tools: McpTool[], names: string[]): McpTool[] {
  return tools.filter((t) => names.some((n) => t.name.includes(n)));
}

function lastContent(messages: { content: unknown }[]): string {
  const last = messages[messages.length - 1];
  if (!last) return "(no response)";
  return typeof last.content === "string" ? last.content : JSON.stringify(last.content);
}

interface DomainDef {
  toolName: string;
  toolDescription: string;
  systemPrompt: string;
  toolNames: string[];
}

const DOMAINS: DomainDef[] = [
  {
    toolName: "consult_users_agent",
    toolDescription:
      "Ask the Users department about user base size, growth, signups, and looking up specific users.",
    systemPrompt:
      "You are the Users analyst for the TrackVibe fitness app. Answer questions about the user base: total users, new signups, weekly active users, and individual user lookups. Use ops_business_overview for aggregates and ops_search_users for specific people. Always cite concrete numbers from the tools; never invent figures.",
    toolNames: ["business_overview", "search_users"],
  },
  {
    toolName: "consult_usage_agent",
    toolDescription:
      "Ask the Usage department which features/endpoints are used vs. unused, request volume, latency, and feature adoption.",
    systemPrompt:
      "You are the Usage/Adoption analyst for TrackVibe. Determine which features and API endpoints are heavily used vs. rarely or never used. Use ops_runtime_metrics for per-endpoint request counts and latency, and ops_activity for feature-adoption signals grouped by event_type. Call out endpoints with near-zero traffic as candidates for 'unused'. Cite numbers.",
    toolNames: ["runtime_metrics", "activity"],
  },
  {
    toolName: "consult_bugs_agent",
    toolDescription:
      "Ask the Bugs/Reliability department about errors, failures, and what is breaking server-side.",
    systemPrompt:
      "You are the Reliability/Bugs analyst for TrackVibe. Identify what is failing: read ops_error_logs for recent errors, ops_runtime_metrics for error counts and slow endpoints, and ops_action_logs for context. Group similar errors, report frequency, and suggest the likely area of the codebase to investigate. Cite the actual log messages.",
    toolNames: ["error_logs", "action_logs", "runtime_metrics"],
  },
  {
    toolName: "consult_app_retention_agent",
    toolDescription:
      "Ask the App-Retention department how well users stick around: active users, churn, and subscription longevity.",
    systemPrompt:
      "You are the App-Retention analyst for TrackVibe. Assess how well the app retains users: compare total vs. weekly-active users (engagement), and read subscription churn from ops_business_overview. Use ops_activity to see whether recent activity is broad or concentrated. Be explicit that precise cohort-retention curves are not yet available from the data and give the best directional read from what is. Cite numbers.",
    toolNames: ["business_overview", "activity"],
  },
  {
    toolName: "consult_trainer_retention_agent",
    toolDescription:
      "Ask the Trainer-Retention department about trainers: how many, how many active with clients, trainer-client link health, and trainer-granted subscriptions.",
    systemPrompt:
      "You are the Trainer-Retention analyst for TrackVibe. Focus on trainers and the trainer-trainee relationship: total trainers, active trainers with clients, active trainer-client links, pending invites, and trainer-granted subscriptions — all from ops_business_overview. Use ops_activity for trainer-side engagement signals. Note that per-trainer retention curves require additional aggregation not yet exposed. Cite numbers.",
    toolNames: ["business_overview", "activity"],
  },
];

/** Build the department agents and return them wrapped as supervisor tools. */
export function buildDepartmentTools(
  llm: BaseChatModel,
  mcpTools: McpTool[],
): DynamicStructuredTool[] {
  return DOMAINS.map((domain) => {
    const tools = pick(mcpTools, domain.toolNames);
    const agent = createReactAgent({ llm, tools });

    return new DynamicStructuredTool({
      name: domain.toolName,
      description: domain.toolDescription,
      schema: z.object({
        question: z.string().describe("The specific question for this department agent"),
      }),
      func: async ({ question }) => {
        const result = await agent.invoke({
          messages: [new SystemMessage(domain.systemPrompt), new HumanMessage(question)],
        });
        return lastContent(result.messages as { content: unknown }[]);
      },
    });
  });
}

export const SUPERVISOR_PROMPT =
  "You are the Ops Copilot orchestrator for the TrackVibe fitness app's admin team. " +
  "You coordinate five specialist department agents available to you as tools: " +
  "Users, Usage, Bugs/Reliability, App-Retention, and Trainer-Retention. " +
  "For each admin question, decide which department(s) to consult — you may consult several, " +
  "in sequence — passing each a clear, focused sub-question. Then synthesize their answers into " +
  "one concise response with concrete numbers and a short 'Departments consulted:' line listing " +
  "which agents you used. Do not invent data; rely only on what the agents return.";
