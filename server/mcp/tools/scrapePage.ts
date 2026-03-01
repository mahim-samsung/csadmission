/**
 * scrapePage — fetches a single URL with retries, respects content-type,
 * and returns structured result including the raw HTML.
 */

import { retry, sleep } from "@/lib/utils";
import { logger } from "@/lib/logger";

const log = logger.child("mcp:tools:scrapePage");

// ── Constants ─────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 1_200;

/**
 * Identifies the crawler for server logs.
 * Use a transparent UA so site owners can contact us.
 */
const USER_AGENT =
  "CSAdmissionBot/1.0 (Academic research; contact: admin@localhost)";

// ── Types ─────────────────────────────────────────

export interface ScrapedPageResult {
  /** Original requested URL */
  url: string;
  /** Final URL after any redirects */
  finalUrl: string;
  /** Raw HTML string — empty on error */
  html: string;
  statusCode: number;
  contentType: string;
  fetchedAt: Date;
  /** Populated when the fetch fails or produces non-HTML content */
  error?: string;
}

export interface ScrapePageOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

// ── Implementation ────────────────────────────────

export async function scrapePage(
  url: string,
  options: ScrapePageOptions = {},
): Promise<ScrapedPageResult> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  } = options;

  log.debug(`Fetching`, { url });

  try {
    const response = await retry(
      async () => {
        const res = await fetch(url, {
          headers: {
            "User-Agent": USER_AGENT,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
          },
          signal: AbortSignal.timeout(timeoutMs),
          redirect: "follow",
        });

        // Back off before retry on rate-limiting or temporary server errors
        if (res.status === 429 || res.status === 503) {
          await sleep(retryDelayMs * 2);
          throw new Error(`HTTP ${res.status} — retrying`);
        }

        return res;
      },
      retries,
      retryDelayMs,
    );

    const contentType = response.headers.get("content-type") ?? "";

    // Skip binary / non-HTML assets
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      log.debug(`Skipping non-HTML response`, { url, contentType });
      return {
        url,
        finalUrl: response.url,
        html: "",
        statusCode: response.status,
        contentType,
        fetchedAt: new Date(),
        error: `Skipped: content-type is "${contentType}"`,
      };
    }

    if (!response.ok) {
      return {
        url,
        finalUrl: response.url,
        html: "",
        statusCode: response.status,
        contentType,
        fetchedAt: new Date(),
        error: `HTTP error ${response.status}`,
      };
    }

    const html = await response.text();

    log.debug(`Scraped`, {
      url,
      finalUrl: response.url,
      statusCode: response.status,
      htmlBytes: html.length,
    });

    return {
      url,
      finalUrl: response.url,
      html,
      statusCode: response.status,
      contentType,
      fetchedAt: new Date(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`scrapePage failed`, { url, error: message });

    return {
      url,
      finalUrl: url,
      html: "",
      statusCode: 0,
      contentType: "",
      fetchedAt: new Date(),
      error: message,
    };
  }
}
