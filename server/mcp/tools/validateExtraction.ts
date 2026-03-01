/**
 * validateExtraction — second LLM pass that scores confidence
 * for each extracted field against the original corpus.
 *
 * If overall_confidence < threshold (default 0.85), the caller
 * should retry extraction or flag the record for manual review.
 */

import { z } from "zod";
import { generate } from "@/server/mcp/models";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { ExtractedAdmission } from "./extractStructuredData";

const log = logger.child("mcp:tools:validateExtraction");

// ── Constants ─────────────────────────────────────

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;

/** Corpus chars sent to the validator — slightly less than extractor. */
const VALIDATION_CORPUS_CHARS = 5_000;

// ── Schema ────────────────────────────────────────

export const ValidationResultSchema = z.object({
  deadline_confidence: z.number().min(0).max(1),
  gre_confidence: z.number().min(0).max(1),
  ielts_confidence: z.number().min(0).max(1),
  toefl_confidence: z.number().min(0).max(1),
  fee_confidence: z.number().min(0).max(1),
  overall_confidence: z.number().min(0).max(1),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export interface ValidationOutcome {
  result: ValidationResult | null;
  needsReview: boolean;
  rawResponse: string;
}

// ── Prompt ────────────────────────────────────────

function buildPrompt(corpus: string, extracted: ExtractedAdmission): string {
  return `You are a validation bot. Rate how well each extracted value is supported by the source text.
Return ONLY a JSON object with confidence scores (0.0 to 1.0). No explanation.

Scoring guide:
- 1.0 = value is explicitly stated in the text and matches exactly
- 0.7 = value is strongly implied
- 0.5 = uncertain / not mentioned (appropriate for null extracted values)
- 0.0 = value contradicts the text or is clearly wrong

Source text (excerpt):
${corpus.slice(0, VALIDATION_CORPUS_CHARS)}

Extracted data:
${JSON.stringify(extracted, null, 2)}

Return:
{
  "deadline_confidence": 0.0 to 1.0,
  "gre_confidence": 0.0 to 1.0,
  "ielts_confidence": 0.0 to 1.0,
  "toefl_confidence": 0.0 to 1.0,
  "fee_confidence": 0.0 to 1.0,
  "overall_confidence": 0.0 to 1.0
}

JSON only:`;
}

// ── JSON extractor (same pattern as extractStructuredData) ────────────────

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch {}
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fence?.[1]) { try { return JSON.parse(fence[1].trim()); } catch {} }
  const s = trimmed.indexOf("{");
  const e = trimmed.lastIndexOf("}");
  if (s !== -1 && e > s) { try { return JSON.parse(trimmed.slice(s, e + 1)); } catch {} }
  return null;
}

// ── Export ────────────────────────────────────────

export async function validateExtraction(
  corpus: string,
  extracted: ExtractedAdmission,
  options?: { model?: string; confidenceThreshold?: number },
): Promise<ValidationOutcome> {
  const model = options?.model ?? env.OLLAMA_MODEL;
  const threshold = options?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  let rawResponse = "";

  try {
    rawResponse = await generate(buildPrompt(corpus, extracted), {
      model,
      options: { temperature: 0 },
    });

    const raw = extractJsonObject(rawResponse);
    if (raw !== null) {
      const parsed = ValidationResultSchema.safeParse(raw);
      if (parsed.success) {
        const { overall_confidence } = parsed.data;
        const needsReview = overall_confidence < threshold;

        log.info(`Validation complete`, {
          overall_confidence,
          needsReview,
          deadline: parsed.data.deadline_confidence,
          gre: parsed.data.gre_confidence,
          ielts: parsed.data.ielts_confidence,
          toefl: parsed.data.toefl_confidence,
          fee: parsed.data.fee_confidence,
        });

        return { result: parsed.data, needsReview, rawResponse };
      }

      log.warn(`Validation Zod parse failed`, {
        issues: ValidationResultSchema.safeParse(raw).error?.issues,
      });
    }
  } catch (err) {
    log.warn(`Validation LLM call failed`, {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fail safe: if validation itself errors, flag for review
  log.warn(`Validation could not complete — flagging for review`);
  return { result: null, needsReview: true, rawResponse };
}
