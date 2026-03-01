/**
 * cleanHtml — strips boilerplate elements from raw HTML and extracts
 * meaningful, deduplicated text suitable for LLM consumption.
 */

import { load } from "cheerio";
import { logger } from "@/lib/logger";

const log = logger.child("mcp:tools:cleanHtml");

// ── Constants ─────────────────────────────────────

/**
 * Character budget for the LLM corpus.
 * llama3:8b has an 8 k-token context window (~4 chars/token).
 * We reserve ~2 k tokens for the prompt, leaving ~24 k chars for content.
 */
export const MAX_CORPUS_CHARS = 24_000;

/** Elements that never contain admission-relevant content. */
const REMOVE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
  ".nav",
  ".navigation",
  ".menu",
  ".sidebar",
  ".footer",
  ".header",
  ".cookie",
  ".cookie-banner",
  ".cookie-notice",
  ".advertisement",
  ".ad",
  "#nav",
  "#navigation",
  "#menu",
  "#footer",
  "#header",
  "#sidebar",
  "#cookie",
];

/** Elements that likely contain substantive content. */
const CONTENT_SELECTORS = [
  "main",
  "article",
  "[role='main']",
  ".content",
  "#content",
  ".main-content",
  "#main-content",
  ".page-content",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "li",
  "td",
  "th",
  "dt",
  "dd",
  "blockquote",
  "section",
].join(", ");

// ── Helpers ───────────────────────────────────────

/**
 * Content fingerprint for deduplication — first 60 normalized chars.
 * Catches nav links, copyright lines, and repeated boilerplate.
 */
function fingerprint(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60);
}

// ── Export ────────────────────────────────────────

export interface CleanHtmlResult {
  text: string;
  wordCount: number;
  wasTruncated: boolean;
  removedElements: number;
}

export function cleanHtml(
  html: string,
  options?: { maxChars?: number },
): CleanHtmlResult {
  const maxChars = options?.maxChars ?? MAX_CORPUS_CHARS;
  const $ = load(html);

  // ── Remove boilerplate ────────────────────────
  let removedElements = 0;
  $(REMOVE_SELECTORS.join(", ")).each(() => {
    removedElements++;
  });
  $(REMOVE_SELECTORS.join(", ")).remove();

  // ── Extract deduplicated content lines ────────
  const seen = new Set<string>();
  const lines: string[] = [];

  $(CONTENT_SELECTORS).each((_, el) => {
    const raw = $(el).text();
    const normalized = raw.replace(/\s+/g, " ").trim();

    if (normalized.length < 20) return; // skip fragments

    const fp = fingerprint(normalized);
    if (seen.has(fp)) return;
    seen.add(fp);

    lines.push(normalized);
  });

  // Fallback: if no structured elements matched, pull all body text
  if (lines.length === 0) {
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    if (bodyText.length >= 20) lines.push(bodyText);
  }

  let text = lines.join("\n\n");
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // ── Truncate ──────────────────────────────────
  const fullLength = text.length;
  const wasTruncated = fullLength > maxChars;

  if (wasTruncated) {
    text = text.slice(0, maxChars) + "\n\n[... content truncated ...]";
    log.debug(`cleanHtml truncated`, {
      from: fullLength,
      to: maxChars,
      wordCount,
    });
  }

  return { text, wordCount, wasTruncated, removedElements };
}
