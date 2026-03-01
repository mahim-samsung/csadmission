/**
 * MCP Policy Layer
 *
 * Policies are rules applied before/after an agent action:
 *   - rate limiting
 *   - content filtering
 *   - tool allow/deny lists
 *   - audit logging
 *
 * Implement each policy as a function matching `PolicyFn` and register
 * it in the `policyChain` array. They run in order.
 */

import { logger } from "@/lib/logger";
import type { AgentContext, ToolCall } from "@/types";

const log = logger.child("mcp:policies");

// ── Policy interface ──────────────────────────────

export interface PolicyDecision {
  allow: boolean;
  reason?: string;
}

export type PolicyFn = (
  context: AgentContext,
  toolCall: ToolCall,
) => PolicyDecision | Promise<PolicyDecision>;

// ── Policy chain ──────────────────────────────────

const policyChain: PolicyFn[] = [];

export function registerPolicy(fn: PolicyFn): void {
  policyChain.push(fn);
}

/**
 * Run all registered policies in sequence.
 * Returns the first DENY decision, or ALLOW if all pass.
 */
export async function evaluatePolicies(
  context: AgentContext,
  toolCall: ToolCall,
): Promise<PolicyDecision> {
  for (const policy of policyChain) {
    const decision = await policy(context, toolCall);
    if (!decision.allow) {
      log.warn(`Policy denied tool call "${toolCall.name}"`, {
        reason: decision.reason,
        sessionId: context.sessionId,
      });
      return decision;
    }
  }
  return { allow: true };
}

// ── Built-in policies ──────────────────────────────

/** Deny any tool whose name starts with an underscore (internal/unsafe). */
registerPolicy((_ctx, toolCall) => {
  if (toolCall.name.startsWith("_")) {
    return { allow: false, reason: "Internal tools are not callable by agents." };
  }
  return { allow: true };
});

/** Stub: rate-limit policy — always allow for now. */
registerPolicy((_ctx, _toolCall) => {
  // TODO: integrate a sliding-window rate limiter (e.g. Upstash Redis)
  return { allow: true };
});
