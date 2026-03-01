/**
 * MCP Tool Registry
 *
 * A "tool" is a typed, self-describing function the agent can call.
 * Each tool must implement the `MCPTool` interface and be registered
 * in the `toolRegistry` map below.
 */

import { logger } from "@/lib/logger";
import type { ToolCall, ToolResult } from "@/types";

const log = logger.child("mcp:tools");

// ── Tool interface ────────────────────────────────

export interface MCPTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema
  execute(input: TInput): Promise<TOutput>;
}

// ── Tool registry ─────────────────────────────────

const toolRegistry = new Map<string, MCPTool>();

export function registerTool(tool: MCPTool): void {
  if (toolRegistry.has(tool.name)) {
    log.warn(`Tool "${tool.name}" is being overwritten in the registry`);
  }
  toolRegistry.set(tool.name, tool);
  log.debug(`Registered tool: ${tool.name}`);
}

export function getTool(name: string): MCPTool | undefined {
  return toolRegistry.get(name);
}

export function listTools(): MCPTool[] {
  return Array.from(toolRegistry.values());
}

// ── Tool executor ─────────────────────────────────

export async function executeTool(call: ToolCall): Promise<ToolResult> {
  const tool = getTool(call.name);

  if (!tool) {
    log.warn(`Unknown tool called: ${call.name}`);
    return {
      toolCallId: call.id,
      content: `Error: tool "${call.name}" is not registered.`,
      isError: true,
    };
  }

  try {
    log.info(`Executing tool: ${call.name}`, { args: call.arguments });
    const result = await tool.execute(call.arguments);
    return {
      toolCallId: call.id,
      content: typeof result === "string" ? result : JSON.stringify(result, null, 2),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Tool "${call.name}" threw an error`, { message });
    return {
      toolCallId: call.id,
      content: `Error executing tool "${call.name}": ${message}`,
      isError: true,
    };
  }
}

// ── Built-in stub tools ───────────────────────────

registerTool({
  name: "get_current_time",
  description: "Returns the current UTC date and time as an ISO 8601 string.",
  inputSchema: { type: "object", properties: {}, required: [] },
  async execute() {
    return new Date().toISOString();
  },
});

registerTool({
  name: "echo",
  description: "Echoes the provided message back. Useful for testing tool plumbing.",
  inputSchema: {
    type: "object",
    properties: { message: { type: "string" } },
    required: ["message"],
  },
  async execute(input: { message: string }) {
    return input.message;
  },
});
