/**
 * discoverLinks — extracts same-domain, admission-keyword-matched hrefs
 * from raw HTML, normalised and deduplicated.
 */

import { load } from "cheerio";
import { logger } from "@/lib/logger";

const log = logger.child("mcp:tools:discoverLinks");

// ── Admission keyword filter ──────────────────────

export const ADMISSION_KEYWORDS = [
  "phd",
  "graduate",
  "admission",
  "apply",
  "deadline",
  "requirement",
  "international",
  "ielts",
  "toefl",
  "gre",
] as const;

// ── URL helpers ───────────────────────────────────

/**
 * Normalise a URL for deduplication:
 * - lowercase scheme + host
 * - strip trailing slash
 * - strip fragment
 * - preserve path + query (needed for dynamic admission portals)
 */
export function normaliseCrawlUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    const path = u.pathname.replace(/\/$/, "") || "/";
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}${u.search}`;
  } catch {
    return raw.trim();
  }
}

function sameDomain(urlA: string, urlB: string): boolean {
  try {
    return new URL(urlA).hostname.toLowerCase() === new URL(urlB).hostname.toLowerCase();
  } catch {
    return false;
  }
}

function hasAdmissionKeyword(href: string, keywords: readonly string[]): boolean {
  const lower = href.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

// ── Export ────────────────────────────────────────

export interface DiscoverLinksOptions {
  /** Only follow links within the same hostname. Default: true. */
  sameDomainOnly?: boolean;
  /** Only follow links whose href contains an admission keyword. Default: true. */
  requireKeywords?: boolean;
  /** Override the default keyword list. */
  keywords?: readonly string[];
}

/**
 * Returns absolute, normalised, deduplicated internal links from `html`
 * that are relevant to CS PhD admissions.
 */
export function discoverLinks(
  html: string,
  baseUrl: string,
  options: DiscoverLinksOptions = {},
): string[] {
  const {
    sameDomainOnly = true,
    requireKeywords = true,
    keywords = ADMISSION_KEYWORDS,
  } = options;

  const $ = load(html);
  const result = new Set<string>();

  $("a[href]").each((_, el) => {
    const raw = $(el).attr("href");
    if (!raw) return;

    // Skip non-navigable hrefs
    if (
      raw.startsWith("mailto:") ||
      raw.startsWith("tel:") ||
      raw.startsWith("javascript:") ||
      raw.startsWith("#") ||
      raw.startsWith("data:")
    ) return;

    // Resolve to absolute
    let absolute: string;
    try {
      absolute = new URL(raw, baseUrl).href;
    } catch {
      return;
    }

    if (!absolute.startsWith("http")) return;
    if (sameDomainOnly && !sameDomain(absolute, baseUrl)) return;
    if (requireKeywords && !hasAdmissionKeyword(absolute, keywords)) return;

    result.add(normaliseCrawlUrl(absolute));
  });

  log.debug(`discoverLinks`, {
    baseUrl,
    total: $("a[href]").length,
    filtered: result.size,
  });

  return Array.from(result);
}
