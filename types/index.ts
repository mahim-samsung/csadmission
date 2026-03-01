// ─────────────────────────────────────────────────────────────
// Shared domain types — keep framework-agnostic
// ─────────────────────────────────────────────────────────────

// ── Generic result wrapper ───────────────────────────────────
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// ── Pagination ───────────────────────────────────────────────
export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Crawler / Scraper ────────────────────────────────────────
export interface CrawlTarget {
  url: string;
  maxDepth?: number;
  maxPages?: number;
  allowedDomains?: string[];
}

export type CrawlStatus = "pending" | "running" | "done" | "failed";

export interface CrawlJob {
  id: string;
  target: CrawlTarget;
  status: CrawlStatus;
  pagesVisited: number;
  startedAt?: Date;
  finishedAt?: Date;
  error?: string;
}

export interface ScrapedPage {
  url: string;
  title?: string;
  content: string;
  links: string[];
  scrapedAt: Date;
}

// ── MCP / Agents ─────────────────────────────────────────────
export type AgentStatus = "idle" | "thinking" | "acting" | "done" | "error";

export interface AgentContext {
  sessionId: string;
  userId?: string;
  messages: ChatMessage[];
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

// ── Ollama ───────────────────────────────────────────────────
export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: Record<string, unknown>;
}

export interface OllamaChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  options?: Record<string, unknown>;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}
