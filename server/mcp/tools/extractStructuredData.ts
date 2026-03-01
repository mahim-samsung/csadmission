/**
 * extractStructuredData — calls Ollama to extract structured CS PhD admission
 * data from a cleaned text corpus.
 *
 * Retry strategy:
 *   Attempt 1 — descriptive extraction prompt
 *   Attempt 2 — minimal template prompt with strict JSON instruction
 *   Fail       — return null + needsReview = true
 */

import { z } from "zod";
import { generate } from "@/server/mcp/models";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const log = logger.child("mcp:tools:extractStructuredData");

// ── Output schema ─────────────────────────────────

export const ExtractedAdmissionSchema = z.object({
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .nullable(),
  gre_required: z.boolean().nullable(),
  ielts_required: z.boolean().nullable(),
  /** IELTS overall band score (0.0 – 9.0 in 0.5 steps) */
  ielts_score: z.number().min(0).max(9).nullable(),
  /** TOEFL iBT total score (0 – 120) */
  toefl_score: z.number().int().min(0).max(120).nullable(),
  /** Application fee in USD, whole dollars */
  application_fee: z.number().int().min(0).nullable(),
  /** Extraction confidence 0.0 – 1.0 */
  confidence_score: z.number().min(0).max(1),
});

export type ExtractedAdmission = z.infer<typeof ExtractedAdmissionSchema>;

export interface ExtractionResult {
  data: ExtractedAdmission | null;
  needsReview: boolean;
  parseAttempts: number;
  rawResponse: string;
}

// ── Prompts ───────────────────────────────────────

function primaryPrompt(corpus: string): string {
  return `You are a data extraction bot. Extract CS PhD admission information from the text below.
Return ONLY a valid JSON object. NO markdown, NO explanation, NO surrounding text.

Required fields (use null if not explicitly stated — do NOT guess):
{
  "deadline": "YYYY-MM-DD or null",
  "gre_required": true or false or null,
  "ielts_required": true or false or null,
  "ielts_score": number or null,
  "toefl_score": number or null,
  "application_fee": number or null,
  "confidence_score": 0.0 to 1.0
}

Rules:
- deadline: Fall semester application deadline only, YYYY-MM-DD format
- gre_required: true = required; false = waived / not required; null = not mentioned
- ielts_required: true if IELTS is listed as an accepted English test
- ielts_score: minimum IELTS band score as decimal (e.g. 7.0)
- toefl_score: minimum TOEFL iBT total score as integer
- application_fee: fee in USD as integer (e.g. 75)
- confidence_score: your confidence 0.0–1.0 that the extraction is accurate
- Return ONLY the JSON object on a single line

Text:
${corpus}

JSON:`;
}

function retryPrompt(corpus: string): string {
  return `Return ONLY this JSON object filled with values found in the text. Use null where not found.

{"deadline":null,"gre_required":null,"ielts_required":null,"ielts_score":null,"toefl_score":null,"application_fee":null,"confidence_score":0.0}

Text (excerpt):
${corpus.slice(0, 6_000)}

JSON only:`;
}

// ── JSON extraction helper ────────────────────────

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();

  // 1. Direct parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Strip markdown code fence
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
  }

  // 3. Grab first { … last }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {}
  }

  return null;
}

// ── Main export ───────────────────────────────────

export async function extractAdmissionData(
  corpus: string,
  options?: { model?: string },
): Promise<ExtractionResult> {
  const model = options?.model ?? env.OLLAMA_MODEL;
  let rawResponse = "";
  let parseAttempts = 0;

  // ── Attempt 1: primary prompt ─────────────────
  try {
    log.debug(`Extraction attempt 1`);
    rawResponse = await generate(primaryPrompt(corpus), {
      model,
      options: { temperature: 0 },
    });
    parseAttempts = 1;

    const raw = extractJsonObject(rawResponse);
    if (raw !== null) {
      const parsed = ExtractedAdmissionSchema.safeParse(raw);
      if (parsed.success) {
        log.info(`Extraction succeeded (attempt 1)`, {
          deadline: parsed.data.deadline,
          gre: parsed.data.gre_required,
          confidence: parsed.data.confidence_score,
        });
        return { data: parsed.data, needsReview: false, parseAttempts, rawResponse };
      }
      log.debug(`Attempt 1 Zod validation failed`, {
        issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
    }
  } catch (err) {
    log.warn(`Extraction attempt 1 threw`, {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ── Attempt 2: strict retry prompt ───────────
  try {
    log.debug(`Extraction attempt 2 (strict prompt)`);
    rawResponse = await generate(retryPrompt(corpus), {
      model,
      options: { temperature: 0 },
    });
    parseAttempts = 2;

    const raw = extractJsonObject(rawResponse);
    if (raw !== null) {
      const parsed = ExtractedAdmissionSchema.safeParse(raw);
      if (parsed.success) {
        log.info(`Extraction succeeded (attempt 2)`, {
          deadline: parsed.data.deadline,
          confidence: parsed.data.confidence_score,
        });
        return { data: parsed.data, needsReview: false, parseAttempts, rawResponse };
      }
    }
  } catch (err) {
    log.warn(`Extraction attempt 2 threw`, {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  log.warn(`Extraction failed after ${parseAttempts} attempt(s) — needsReview`);
  return { data: null, needsReview: true, parseAttempts, rawResponse };
}
