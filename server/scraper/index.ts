/**
 * Scraper module — stub.
 *
 * Responsible for extracting structured data from raw HTML.
 * This module is intentionally left as a typed stub.
 * Actual scraping logic (cheerio / Playwright) will be added later.
 */

import { logger } from "@/lib/logger";
import type { ScrapedPage } from "@/types";

const log = logger.child("scraper");

export interface ScrapeOptions {
  url: string;
  html?: string;
  /** CSS selector for the main content area — defaults to "body". */
  contentSelector?: string;
  /** CSS selector for links to extract — defaults to "a[href]". */
  linkSelector?: string;
}

export interface ScrapeResult extends ScrapedPage {
  rawHtml: string;
  statusCode?: number;
}

/**
 * Fetch and scrape a single URL.
 * Returns the page title, clean text content, and outbound links.
 *
 * TODO: replace stub with real implementation using:
 *   - `cheerio` for static pages
 *   - `playwright` / `puppeteer` for JS-rendered pages
 */
export async function scrapePage(opts: ScrapeOptions): Promise<ScrapeResult> {
  log.info(`Scraping page (stub)`, { url: opts.url });

  return {
    url: opts.url,
    title: undefined,
    content: "",
    links: [],
    scrapedAt: new Date(),
    rawHtml: opts.html ?? "",
    statusCode: 200,
  };
}

/**
 * Extract clean readable text from raw HTML.
 * TODO: implement with cheerio + turndown (HTML → Markdown)
 */
export function extractText(html: string): string {
  // Stub: strip all HTML tags with a naive regex.
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Extract all href links from raw HTML.
 * TODO: implement with cheerio
 */
export function extractLinks(html: string, baseUrl: string): string[] {
  const hrefRegex = /href=["']([^"']+)["']/gi;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      const absolute = new URL(match[1], baseUrl).href;
      links.push(absolute);
    } catch {
      // Skip malformed URLs.
    }
  }

  return [...new Set(links)];
}
