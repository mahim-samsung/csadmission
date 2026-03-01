/**
 * Agent Runner
 *
 * Orchestrates the ReAct-style loop:
 *   1. Build prompt from context + tool descriptions
 *   2. Call the LLM
 *   3. Parse tool calls from the response
 *   4. Evaluate policies
 *   5. Execute tools
 *   6. Append tool results and loop until done
 */

import { logger } from "@/lib/logger";
import { chat } from "@/server/mcp/models";
import { listTools, executeTool } from "@/server/mcp/tools";
import { evaluatePolicies } from "@/server/mcp/policies";
import type { AgentContext, ChatMessage, ToolCall } from "@/types";

const log = logger.child("agent");

const MAX_ITERATIONS = 8;

// ── System prompt builder ─────────────────────────

function buildSystemPrompt(): string {
  const tools = listTools()
    .map(
      (t) =>
        `- **${t.name}**: ${t.description}\n  Input schema: ${JSON.stringify(t.inputSchema)}`,
    )
    .join("\n");

  return `You are an expert CS graduate admissions assistant.
You help applicants understand admission requirements, deadlines, and programs.

When you need information, call one of the available tools.
Respond with a JSON object to call a tool:
{"tool": "<name>", "id": "<uuid>", "arguments": {<args>}}

Available tools:
${tools}

When you have a final answer, respond in plain text without any JSON.`;
}

// ── Tool call parser ──────────────────────────────

function parseToolCall(response: string): ToolCall | null {
  try {
    const json = JSON.parse(response.trim());
    if (
      typeof json === "object" &&
      json !== null &&
      typeof json.tool === "string" &&
      typeof json.id === "string"
    ) {
      return {
        id: json.id as string,
        name: json.tool as string,
        arguments: (json.arguments ?? {}) as Record<string, unknown>,
      };
    }
  } catch {
    // Not JSON — treat as plain text response.
  }
  return null;
}

// ── Agent run ─────────────────────────────────────

export interface AgentRunResult {
  finalAnswer: string;
  iterations: number;
  messages: ChatMessage[];
}

export async function runAgent(context: AgentContext): Promise<AgentRunResult> {
  log.info(`Agent run started`, { sessionId: context.sessionId });

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    ...context.messages,
  ];

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    log.debug(`Iteration ${iterations}`, { sessionId: context.sessionId });

    const response = await chat(messages);
    const toolCall = parseToolCall(response);

    if (!toolCall) {
      log.info(`Agent completed in ${iterations} iteration(s)`, {
        sessionId: context.sessionId,
      });
      return { finalAnswer: response, iterations, messages };
    }

    // Policy check.
    const policy = await evaluatePolicies(context, toolCall);
    if (!policy.allow) {
      const denied: ChatMessage = {
        role: "tool",
        content: `Policy denied: ${policy.reason ?? "not allowed"}`,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
      };
      messages.push({ role: "assistant", content: response }, denied);
      continue;
    }

    // Execute.
    const result = await executeTool(toolCall);
    messages.push(
      { role: "assistant", content: response },
      {
        role: "tool",
        content: result.content,
        toolCallId: result.toolCallId,
        toolName: toolCall.name,
      },
    );
  }

  const exhausted = "I've reached my action limit. Please try rephrasing your question.";
  log.warn(`Agent exceeded max iterations`, { sessionId: context.sessionId });
  return { finalAnswer: exhausted, iterations, messages };
}
