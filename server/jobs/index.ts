/**
 * Background Jobs
 *
 * Two schedulers:
 *   startJobPoller()           — processes PENDING CrawlJob rows (lightweight, 5 s interval)
 *   startWeeklyCrawlScheduler()— runs AdmissionOrchestrator for every university (weekly)
 *
 * For production: replace setInterval with BullMQ + Redis or Trigger.dev.
 */

import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { crawl } from "@/server/crawler";
import { sleep } from "@/lib/utils";
import {
  AdmissionOrchestrator,
  type OrchestratorResult,
} from "@/server/agents/AdmissionOrchestrator";

const log = logger.child("jobs");

// ── Constants ─────────────────────────────────────

const WEEK_MS = 7 * 24 * 60 * 60 * 1_000;

/**
 * Delay between universities during a weekly run.
 * Keeps total load manageable and avoids hammering the LLM.
 */
const INTER_UNIVERSITY_DELAY_MS = 3_000;

// ── CrawlJob poller ───────────────────────────────

async function processPendingCrawlJob(): Promise<boolean> {
  const job = await db.crawlJob.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  if (!job) return false;

  log.info(`Processing crawl job`, { jobId: job.id, url: job.targetUrl });

  await db.crawlJob.update({
    where: { id: job.id },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    const result = await crawl({
      jobId: job.id,
      url: job.targetUrl,
      maxDepth: job.maxDepth,
      maxPages: job.maxPages,
    });

    await db.crawlJob.update({
      where: { id: job.id },
      data: {
        status: "DONE",
        finishedAt: new Date(),
        pagesVisited: result.pagesVisited,
      },
    });

    log.info(`Crawl job completed`, { jobId: job.id, pages: result.pagesVisited });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Crawl job failed`, { jobId: job.id, message });

    await db.crawlJob.update({
      where: { id: job.id },
      data: { status: "FAILED", finishedAt: new Date(), errorMessage: message },
    });

    return true;
  }
}

let pollerRunning = false;

export function startJobPoller(intervalMs = 5_000): void {
  if (pollerRunning) {
    log.warn("Job poller already running");
    return;
  }

  pollerRunning = true;
  log.info(`Job poller started (interval: ${intervalMs}ms)`);

  void (async () => {
    while (pollerRunning) {
      try {
        await processPendingCrawlJob();
      } catch (err) {
        log.error("Unexpected error in job poller", { err });
      }
      await sleep(intervalMs);
    }
  })();
}

export function stopJobPoller(): void {
  pollerRunning = false;
  log.info("Job poller stopped");
}

// ── Weekly admission crawl ────────────────────────

export interface WeeklyRunSummary {
  startedAt: Date;
  finishedAt: Date;
  total: number;
  succeeded: number;
  failed: number;
  needsReview: number;
  results: OrchestratorResult[];
}

/**
 * Run AdmissionOrchestrator sequentially for every university that has a
 * csAdmissionUrl.  Continues on per-university errors — never throws.
 */
export async function runWeeklyAdmissionCrawl(): Promise<WeeklyRunSummary> {
  const startedAt = new Date();
  log.info(`Weekly admission crawl starting`, { startedAt });

  const universities = await db.university.findMany({
    where: { csAdmissionUrl: { not: null } },
    orderBy: { csRanking: "asc" },
    select: { id: true, name: true, csRanking: true },
  });

  log.info(`Found ${universities.length} universities with csAdmissionUrl`);

  const orchestrator = new AdmissionOrchestrator();
  const results: OrchestratorResult[] = [];

  for (let i = 0; i < universities.length; i++) {
    const uni = universities[i]!;
    log.info(`Processing university ${i + 1}/${universities.length}`, {
      id: uni.id,
      name: uni.name,
      ranking: uni.csRanking,
    });

    const result = await orchestrator.run(uni.id);
    results.push(result);

    log.info(`University result`, {
      name: uni.name,
      success: result.success,
      pagesScraped: result.pagesScraped,
      pagesRelevant: result.pagesRelevant,
      hasChanges: result.diff?.hasChanges,
      needsReview: result.needsReview,
      confidenceScore: result.validation?.result?.overall_confidence,
      durationMs: result.durationMs,
      error: result.error,
    });

    // Respectful inter-university pause
    if (i < universities.length - 1) {
      await sleep(INTER_UNIVERSITY_DELAY_MS);
    }
  }

  const finishedAt = new Date();
  const summary: WeeklyRunSummary = {
    startedAt,
    finishedAt,
    total: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    needsReview: results.filter((r) => r.needsReview).length,
    results,
  };

  log.info(`Weekly admission crawl complete`, {
    total: summary.total,
    succeeded: summary.succeeded,
    failed: summary.failed,
    needsReview: summary.needsReview,
    durationMs: finishedAt.getTime() - startedAt.getTime(),
  });

  return summary;
}

// ── Weekly scheduler ──────────────────────────────

let weeklySchedulerRunning = false;

/**
 * Start the weekly admission crawl scheduler.
 *
 * - Waits `initialDelayMs` before first run (default 60 s, allowing the
 *   server to warm up and avoiding immediate crawl on every restart).
 * - Then repeats every 7 days.
 *
 * For production use a proper cron (BullMQ, Trigger.dev, Vercel Cron).
 */
export function startWeeklyCrawlScheduler(
  opts: { initialDelayMs?: number } = {},
): void {
  if (weeklySchedulerRunning) {
    log.warn("Weekly crawl scheduler already running");
    return;
  }

  weeklySchedulerRunning = true;
  const initialDelay = opts.initialDelayMs ?? 60_000;

  log.info(`Weekly crawl scheduler registered`, {
    initialDelayMs: initialDelay,
    intervalMs: WEEK_MS,
  });

  const tick = async () => {
    log.info(`Weekly crawl tick — running now`);
    try {
      await runWeeklyAdmissionCrawl();
    } catch (err) {
      log.error(`Weekly crawl top-level error`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // First run after initial delay, then every week
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), WEEK_MS);
  }, initialDelay);
}

export function stopWeeklyCrawlScheduler(): void {
  weeklySchedulerRunning = false;
  log.info("Weekly crawl scheduler flag cleared (active timers not cancelled — restart server)");
}
