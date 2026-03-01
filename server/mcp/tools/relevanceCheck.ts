/**
 * relevanceCheck — sends a small text snippet to Ollama and asks
 * "Is this relevant to CS PhD admissions?" expecting YES or NO.
 *
 * Fails open: if Ollama is unreachable, the page is included
 * so the corpus is not silently emptied.
 */

import { generate } from "@/server/mcp/models";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const log = logger.child("mcp:tools:relevanceCheck");

// ── Constants ─────────────────────────────────────

/** Characters sent to Ollama — enough context without wasting tokens. */
const SNIPPET_CHARS = 2_500;

/** Minimum page length to bother checking. */
const MIN_PAGE_CHARS = 50;

// ── Prompt ────────────────────────────────────────

function buildPrompt(snippet: string): string {
  return `Is this page relevant to Computer Science PhD admission requirements? Answer YES or NO only.

Page text:
${snippet}

Answer (YES or NO only):`;
}

// ── Export ────────────────────────────────────────

export interface RelevanceCheckResult {
  isRelevant: boolean;
  /** Raw response from the model before normalisation */
  rawResponse: string;
  /** true when Ollama could not be reached and we defaulted to true */
  usedFallback: boolean;
}

export async function isPageRelevant(
  text: string,
  model?: string,
): Promise<RelevanceCheckResult> {
  if (!text || text.trim().length < MIN_PAGE_CHARS) {
    log.debug(`Page too short — marking not relevant`);
    return { isRelevant: false, rawResponse: "", usedFallback: false };
  }

  const snippet = text.slice(0, SNIPPET_CHARS);

  try {
    const rawResponse = await generate(buildPrompt(snippet), {
      model: model ?? env.OLLAMA_MODEL,
      options: {
        temperature: 0,
        num_predict: 10, // Only need YES or NO
      },
    });

    const normalised = rawResponse.trim().toUpperCase();
    const isRelevant = normalised.startsWith("YES");

    log.debug(`Relevance check`, {
      isRelevant,
      rawResponse: rawResponse.trim().slice(0, 30),
    });

    return { isRelevant, rawResponse, usedFallback: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`Relevance check failed — defaulting to relevant`, { error: message });

    // Fail open: include the page so the corpus is not silently emptied
    return { isRelevant: true, rawResponse: "", usedFallback: true };
  }
}
