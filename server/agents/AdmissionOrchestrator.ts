/**
 * AdmissionOrchestrator
 *
 * Runs the full agentic pipeline for one university:
 *   1. Crawl   — BFS from csAdmissionUrl, keyword-filtered, depth/page-bounded
 *   2. Relevance filter — per-page Ollama YES/NO check
 *   3. Build corpus — merge + deduplicate clean text
 *   4. Extract — LLM structured-data extraction with 2-attempt retry
 *   5. Validate — second LLM confidence-scoring pass
 *   6. Diff    — compare against existing DB record
 *   7. Persist — upsert CsPhdAdmission, field-level change log
 */

import { db } from "@/server/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sleep } from "@/lib/utils";

import { scrapePage } from "@/server/mcp/tools/scrapePage";
import { discoverLinks, normaliseCrawlUrl } from "@/server/mcp/tools/discoverLinks";
import { cleanHtml, MAX_CORPUS_CHARS } from "@/server/mcp/tools/cleanHtml";
import { isPageRelevant } from "@/server/mcp/tools/relevanceCheck";
import {
  extractAdmissionData,
  type ExtractionResult,
} from "@/server/mcp/tools/extractStructuredData";
import {
  validateExtraction,
  DEFAULT_CONFIDENCE_THRESHOLD,
  type ValidationOutcome,
} from "@/server/mcp/tools/validateExtraction";
import { diffAdmission, type DiffResult } from "@/server/mcp/tools/diffEngine";

const log = logger.child("agent:orchestrator");

// ── Crawler ───────────────────────────────────────────────────────────────

interface CrawledPage {
  url: string;
  html: string;
  cleanText: string;
  depth: number;
}

interface FocusedCrawlerOptions {
  maxDepth?: number;
  maxPages?: number;
  /** Milliseconds to sleep between page fetches */
  delayMs?: number;
}

/**
 * BFS-based focused crawler.
 *
 * - Starts from `startUrl`
 * - Expands only same-domain, admission-keyword-matched links
 * - Respects maxDepth and maxPages from env
 * - Tracks visited URLs to prevent loops
 */
async function focusedCrawl(
  startUrl: string,
  options: FocusedCrawlerOptions = {},
): Promise<CrawledPage[]> {
  const maxDepth = options.maxDepth ?? env.CRAWL_MAX_DEPTH;
  const maxPages = options.maxPages ?? env.CRAWL_MAX_PAGES;
  const delayMs = options.delayMs ?? 600;

  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [
    { url: normaliseCrawlUrl(startUrl), depth: 0 },
  ];
  const results: CrawledPage[] = [];

  log.info(`Crawl starting`, { startUrl, maxDepth, maxPages });

  while (queue.length > 0 && results.length < maxPages) {
    const entry = queue.shift();
    if (!entry) break;
    const { url, depth } = entry;

    const normalised = normaliseCrawlUrl(url);
    if (visited.has(normalised)) continue;
    visited.add(normalised);

    log.debug(`Scraping`, { url, depth, queued: queue.length });

    const scraped = await scrapePage(url);

    if (scraped.error ?? !scraped.html) {
      log.debug(`Skipping — scrape error`, { url, error: scraped.error });
      if (delayMs > 0) await sleep(delayMs);
      continue;
    }

    const { text: cleanText } = cleanHtml(scraped.html);

    results.push({ url: scraped.finalUrl, html: scraped.html, cleanText, depth });

    // Discover and enqueue next-level links
    if (depth < maxDepth) {
      const links = discoverLinks(scraped.html, scraped.finalUrl);
      for (const link of links) {
        const normLink = normaliseCrawlUrl(link);
        if (!visited.has(normLink)) {
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    }

    if (delayMs > 0) await sleep(delayMs);
  }

  log.info(`Crawl finished`, {
    startUrl,
    pagesScraped: results.length,
    urlsVisited: visited.size,
  });

  return results;
}

// ── Result type ───────────────────────────────────────────────────────────

export interface OrchestratorResult {
  universityId: string;
  universityName: string;
  success: boolean;
  pagesScraped: number;
  pagesRelevant: number;
  extraction: ExtractionResult | null;
  validation: ValidationOutcome | null;
  diff: DiffResult | null;
  admissionId: string | null;
  needsReview: boolean;
  /** Set when the run was skipped or failed entirely */
  error?: string;
  durationMs: number;
}

// ── Corpus builder ────────────────────────────────────────────────────────

/**
 * Merge per-page clean text into a single corpus string.
 * Deduplicates at the corpus level and enforces the global char budget.
 */
function buildCorpus(pages: CrawledPage[]): string {
  // Budget shared across all pages
  const PER_PAGE_BUDGET = Math.floor(MAX_CORPUS_CHARS / Math.max(pages.length, 1));
  const seen = new Set<string>();
  const parts: string[] = [];
  let totalChars = 0;

  for (const page of pages) {
    const header = `\n--- ${page.url} ---\n`;
    const body = page.cleanText.slice(0, PER_PAGE_BUDGET);

    // Coarse page-level deduplication
    const fp = body.slice(0, 80).toLowerCase();
    if (seen.has(fp)) continue;
    seen.add(fp);

    parts.push(header + body);
    totalChars += header.length + body.length;

    if (totalChars >= MAX_CORPUS_CHARS) break;
  }

  let corpus = parts.join("\n");
  if (corpus.length > MAX_CORPUS_CHARS) {
    corpus = corpus.slice(0, MAX_CORPUS_CHARS) + "\n\n[... corpus truncated ...]";
  }

  return corpus;
}

// ── Orchestrator ──────────────────────────────────────────────────────────

export class AdmissionOrchestrator {
  private readonly log = log;

  async run(universityId: string): Promise<OrchestratorResult> {
    const startTime = Date.now();

    const base: Omit<OrchestratorResult, "durationMs"> = {
      universityId,
      universityName: "",
      success: false,
      pagesScraped: 0,
      pagesRelevant: 0,
      extraction: null,
      validation: null,
      diff: null,
      admissionId: null,
      needsReview: false,
    };

    const done = (override: Partial<OrchestratorResult> = {}): OrchestratorResult => ({
      ...base,
      ...override,
      durationMs: Date.now() - startTime,
    });

    // ── Step 1: Load university ───────────────────────────────────────
    const university = await db.university.findUnique({
      where: { id: universityId },
      include: {
        admissions: {
          orderBy: { lastVerifiedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!university) {
      return done({ error: `University "${universityId}" not found` });
    }

    base.universityName = university.name;
    this.log.info(`Orchestrator started`, { universityId, name: university.name });

    if (!university.csAdmissionUrl) {
      this.log.warn(`No csAdmissionUrl — skipping`, { universityId });
      // Touch lastVerifiedAt so we don't retry immediately
      await this.touchLastVerified(university.admissions[0]?.id ?? null, universityId);
      return done({
        needsReview: true,
        error: "No csAdmissionUrl configured",
      });
    }

    const existingAdmission = university.admissions[0] ?? null;

    try {
      // ── Step 2: Crawl ─────────────────────────────────────────────
      const crawledPages = await focusedCrawl(university.csAdmissionUrl);
      base.pagesScraped = crawledPages.length;

      if (crawledPages.length === 0) {
        await this.touchLastVerified(existingAdmission?.id ?? null, universityId);
        return done({
          needsReview: true,
          error: "Crawl returned 0 pages",
        });
      }

      // ── Step 3: Relevance filter ──────────────────────────────────
      this.log.info(`Relevance checking ${crawledPages.length} page(s)`);
      const relevantPages: CrawledPage[] = [];

      for (const page of crawledPages) {
        const { isRelevant, usedFallback } = await isPageRelevant(page.cleanText);
        if (isRelevant) {
          relevantPages.push(page);
          this.log.debug(`Relevant`, { url: page.url, fallback: usedFallback });
        } else {
          this.log.debug(`Not relevant`, { url: page.url });
        }
      }

      base.pagesRelevant = relevantPages.length;

      if (relevantPages.length === 0) {
        this.log.warn(`No relevant pages after filtering`);
        await this.touchLastVerified(existingAdmission?.id ?? null, universityId);
        return done({
          needsReview: true,
          error: "No relevant pages found after relevance filtering",
        });
      }

      // ── Step 4: Build corpus ──────────────────────────────────────
      const corpus = buildCorpus(relevantPages);
      this.log.info(`Corpus built`, {
        chars: corpus.length,
        pages: relevantPages.length,
      });

      // ── Step 5: Extract ───────────────────────────────────────────
      this.log.info(`Extracting structured data`);
      let extraction = await extractAdmissionData(corpus);
      base.extraction = extraction;

      if (!extraction.data) {
        // Both extraction attempts failed — persist what we know
        await this.persistFailed(existingAdmission?.id ?? null, universityId, corpus);
        return done({
          extraction,
          needsReview: true,
          error: "Extraction failed — could not parse LLM JSON after 2 attempts",
        });
      }

      // ── Step 6: Validate ──────────────────────────────────────────
      this.log.info(`Validating extraction`);
      let validation = await validateExtraction(corpus, extraction.data);
      base.validation = validation;

      // If validation flags low confidence → retry extraction once
      if (validation.needsReview) {
        this.log.warn(`Low validation confidence — retrying extraction`, {
          overall: validation.result?.overall_confidence,
        });

        const retryExtraction = await extractAdmissionData(corpus);
        if (retryExtraction.data) {
          extraction = retryExtraction;
          base.extraction = extraction;
          // Re-validate the retry
          validation = await validateExtraction(corpus, retryExtraction.data);
          base.validation = validation;
        }
      }

      // Guard: if both extraction attempts produced no data, persist failure and bail
      if (!extraction.data) {
        await this.persistFailed(existingAdmission?.id ?? null, universityId, corpus);
        return done({
          extraction,
          validation,
          needsReview: true,
          error: "Extraction still null after retry",
        });
      }

      // extraction.data is guaranteed non-null from here
      const extractedData = extraction.data;

      const needsReview = validation.needsReview || extraction.needsReview;
      const confidenceScore =
        validation.result?.overall_confidence ?? extractedData.confidence_score;

      if (validation.needsReview) {
        this.log.warn(`Confidence still below threshold after retry — flagging`, {
          threshold: DEFAULT_CONFIDENCE_THRESHOLD,
          actual: validation.result?.overall_confidence,
        });
      }

      // ── Step 7: Diff ──────────────────────────────────────────────
      const diff = diffAdmission(existingAdmission, extractedData);
      base.diff = diff;

      if (diff.hasChanges) {
        this.log.info(`Changes detected`, { summary: diff.summary });
        diff.changes.forEach((c) =>
          this.log.info(`Field changed`, {
            field: c.field,
            old: c.oldValue,
            new: c.newValue,
          }),
        );
      } else {
        this.log.info(`No changes — updating lastVerifiedAt`);
      }

      // ── Step 8: Persist ───────────────────────────────────────────
      const deadlineDate = extractedData.deadline ? new Date(extractedData.deadline) : null;
      const rawSnapshot = corpus.slice(0, 10_000);

      let admissionId: string;

      if (existingAdmission) {
        const updated = await db.csPhdAdmission.update({
          where: { id: existingAdmission.id },
          data: {
            // Only write changed fields — prevents spurious audit trails
            ...(diff.hasChanges
              ? {
                  deadline: deadlineDate,
                  greRequired: extractedData.gre_required,
                  ieltsRequired: extractedData.ielts_required,
                  ieltsScore: extractedData.ielts_score,
                  toeflScore: extractedData.toefl_score,
                  applicationFee: extractedData.application_fee,
                }
              : {}),
            confidenceScore,
            needsReview,
            lastVerifiedAt: new Date(),
            rawHtmlSnapshot: rawSnapshot,
          },
          select: { id: true },
        });
        admissionId = updated.id;
      } else {
        const created = await db.csPhdAdmission.create({
          data: {
            universityId,
            deadline: deadlineDate,
            greRequired: extractedData.gre_required,
            ieltsRequired: extractedData.ielts_required,
            ieltsScore: extractedData.ielts_score,
            toeflScore: extractedData.toefl_score,
            applicationFee: extractedData.application_fee,
            confidenceScore,
            needsReview,
            lastVerifiedAt: new Date(),
            rawHtmlSnapshot: rawSnapshot,
          },
          select: { id: true },
        });
        admissionId = created.id;
      }

      base.admissionId = admissionId;

      const durationMs = Date.now() - startTime;
      this.log.info(`Orchestrator complete`, {
        universityId,
        name: university.name,
        admissionId,
        hasChanges: diff.hasChanges,
        confidenceScore,
        needsReview,
        durationMs,
      });

      return done({
        success: true,
        admissionId,
        needsReview,
        extraction,
        validation,
        diff,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log.error(`Orchestrator failed`, { universityId, error: message });

      // Best-effort: keep lastVerifiedAt fresh so the error is visible in the DB
      await this.touchLastVerified(existingAdmission?.id ?? null, universityId).catch(
        () => undefined,
      );

      return done({ error: message, needsReview: true });
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Update lastVerifiedAt without changing any other fields. */
  private async touchLastVerified(
    admissionId: string | null,
    universityId: string,
  ): Promise<void> {
    if (admissionId) {
      await db.csPhdAdmission.update({
        where: { id: admissionId },
        data: { lastVerifiedAt: new Date(), needsReview: true },
      });
    } else {
      // Create a minimal stub record so lastVerifiedAt is always persisted
      await db.csPhdAdmission.create({
        data: {
          universityId,
          lastVerifiedAt: new Date(),
          confidenceScore: 0,
          needsReview: true,
          rawHtmlSnapshot: "[verification attempted — no data extracted]",
        },
      });
    }
  }

  /** Persist a failed-extraction record — keeps lastVerifiedAt current. */
  private async persistFailed(
    admissionId: string | null,
    universityId: string,
    corpus: string,
  ): Promise<void> {
    const snapshot = corpus.slice(0, 10_000) || "[empty corpus]";
    if (admissionId) {
      await db.csPhdAdmission.update({
        where: { id: admissionId },
        data: {
          lastVerifiedAt: new Date(),
          needsReview: true,
          rawHtmlSnapshot: snapshot,
        },
      });
    } else {
      await db.csPhdAdmission.create({
        data: {
          universityId,
          lastVerifiedAt: new Date(),
          confidenceScore: 0,
          needsReview: true,
          rawHtmlSnapshot: snapshot,
        },
      });
    }
  }
}
