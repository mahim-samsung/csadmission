/**
 * Crawler module — stub.
 *
 * Provides the structural interface for a BFS/DFS web crawler.
 * Actual HTTP fetching and HTML parsing are NOT implemented yet.
 *
 * Usage:
 *   const result = await crawl({ url: "https://cs.mit.edu/admissions", maxDepth: 2, maxPages: 12 });
 */

import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import type { CrawlTarget, CrawlJob, ScrapedPage, CrawlStatus } from "@/types";

const log = logger.child("crawler");

// ── State ─────────────────────────────────────────

const activeJobs = new Map<string, CrawlJob>();

// ── Public API ────────────────────────────────────

export interface CrawlOptions extends Partial<CrawlTarget> {
  url: string;
  jobId?: string;
  onPage?: (page: ScrapedPage) => Promise<void>;
}

export async function crawl(opts: CrawlOptions): Promise<CrawlJob> {
  const jobId = opts.jobId ?? crypto.randomUUID();
  const maxDepth = opts.maxDepth ?? env.CRAWL_MAX_DEPTH;
  const maxPages = opts.maxPages ?? env.CRAWL_MAX_PAGES;

  const job: CrawlJob = {
    id: jobId,
    target: { url: opts.url, maxDepth, maxPages },
    status: "pending" as CrawlStatus,
    pagesVisited: 0,
    startedAt: new Date(),
  };

  activeJobs.set(jobId, job);
  log.info(`Crawl job created`, { jobId, url: opts.url, maxDepth, maxPages });

  // TODO: implement crawl loop using fetch + cheerio/jsdom + URL queue
  // Placeholder: mark as done immediately.
  job.status = "done";
  job.finishedAt = new Date();

  activeJobs.set(jobId, job);
  log.info(`Crawl job finished (stub)`, { jobId });

  return job;
}

export function getJob(jobId: string): CrawlJob | undefined {
  return activeJobs.get(jobId);
}

export function listJobs(): CrawlJob[] {
  return Array.from(activeJobs.values());
}
