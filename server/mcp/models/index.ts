/**
 * MCP Model Layer — abstracts communication with local / remote LLMs.
 *
 * Currently targets Ollama. Swap `OllamaModel` for any OpenAI-compatible
 * client (Together AI, OpenRouter, etc.) without touching the agent layer.
 */

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { retry } from "@/lib/utils";
import type {
  OllamaChatRequest,
  OllamaGenerateRequest,
  OllamaResponse,
  ChatMessage,
} from "@/types";

const log = logger.child("mcp:models");

// ── Ollama client ─────────────────────────────────

async function ollamaFetch<T>(path: string, body: unknown): Promise<T> {
  const url = `${env.OLLAMA_BASE_URL}${path}`;
  log.debug(`POST ${url}`);

  const res = await retry(async () => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    if (!r.ok) {
      throw new Error(`Ollama ${path} → HTTP ${r.status}: ${await r.text()}`);
    }

    return r;
  });

  return res.json() as Promise<T>;
}

export async function generate(
  prompt: string,
  options?: Partial<OllamaGenerateRequest>,
): Promise<string> {
  const req: OllamaGenerateRequest = {
    model: env.OLLAMA_MODEL,
    prompt,
    stream: false,
    ...options,
  };

  const data = await ollamaFetch<OllamaResponse>("/api/generate", req);
  return data.response;
}

export async function chat(
  messages: ChatMessage[],
  options?: Partial<OllamaChatRequest>,
): Promise<string> {
  const req: OllamaChatRequest = {
    model: env.OLLAMA_MODEL,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: false,
    ...options,
  };

  const data = await ollamaFetch<{ message: { content: string } }>(
    "/api/chat",
    req,
  );

  return data.message.content;
}

export async function listModels(): Promise<string[]> {
  const url = `${env.OLLAMA_BASE_URL}/api/tags`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to list Ollama models: HTTP ${res.status}`);
  const data = (await res.json()) as { models: Array<{ name: string }> };
  return data.models.map((m) => m.name);
}
