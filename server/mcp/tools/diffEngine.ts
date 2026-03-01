/**
 * diffEngine — compares a previous CsPhdAdmission DB record with a freshly
 * extracted admission snapshot, returning a field-level change log.
 *
 * Rules:
 * - null previous  → first import, all non-null extracted fields are "added"
 * - existing record → compare each field; report those that changed
 */

import { type CsPhdAdmission } from "@prisma/client";
import type { ExtractedAdmission } from "./extractStructuredData";
import { logger } from "@/lib/logger";

const log = logger.child("mcp:tools:diffEngine");

// ── Types ─────────────────────────────────────────

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  /** Human-readable one-liner */
  description: string;
}

export interface DiffResult {
  hasChanges: boolean;
  changes: FieldChange[];
  /** One-line summary of what changed */
  summary: string;
}

// ── Helpers ───────────────────────────────────────

/** Convert a Prisma DateTime to YYYY-MM-DD string for comparison. */
function dateToIso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/** Deep-equal via JSON serialisation (sufficient for primitives + null). */
function isDifferent(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

function makeChange(field: string, oldVal: unknown, newVal: unknown): FieldChange {
  return {
    field,
    oldValue: oldVal,
    newValue: newVal,
    description: `${field}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`,
  };
}

// ── Export ────────────────────────────────────────

/**
 * Compare a Prisma `CsPhdAdmission` record (or null for first import)
 * against freshly extracted data.
 *
 * Returns a `DiffResult` with field-level changes and a summary string.
 */
export function diffAdmission(
  previous: CsPhdAdmission | null,
  extracted: ExtractedAdmission,
): DiffResult {
  // ── First import ──────────────────────────────
  if (!previous) {
    const changes: FieldChange[] = [
      makeChange("deadline", null, extracted.deadline),
      makeChange("greRequired", null, extracted.gre_required),
      makeChange("ieltsRequired", null, extracted.ielts_required),
      makeChange("ieltsScore", null, extracted.ielts_score),
      makeChange("toeflScore", null, extracted.toefl_score),
      makeChange("applicationFee", null, extracted.application_fee),
    ].filter((c) => c.newValue !== null); // skip fields the LLM could not find

    const summary =
      changes.length > 0
        ? `Initial import: ${changes.length} field(s) populated (${changes.map((c) => c.field).join(", ")})`
        : "Initial import: no structured data found";

    log.info(`Diff — first import`, { summary, changes: changes.length });

    return { hasChanges: true, changes, summary };
  }

  // ── Subsequent update ─────────────────────────
  const changes: FieldChange[] = [];

  const prevDeadline = dateToIso(previous.deadline);
  if (isDifferent(prevDeadline, extracted.deadline)) {
    changes.push(makeChange("deadline", prevDeadline, extracted.deadline));
  }

  if (isDifferent(previous.greRequired, extracted.gre_required)) {
    changes.push(makeChange("greRequired", previous.greRequired, extracted.gre_required));
  }

  if (isDifferent(previous.ieltsRequired, extracted.ielts_required)) {
    changes.push(makeChange("ieltsRequired", previous.ieltsRequired, extracted.ielts_required));
  }

  if (isDifferent(previous.ieltsScore, extracted.ielts_score)) {
    changes.push(makeChange("ieltsScore", previous.ieltsScore, extracted.ielts_score));
  }

  if (isDifferent(previous.toeflScore, extracted.toefl_score)) {
    changes.push(makeChange("toeflScore", previous.toeflScore, extracted.toefl_score));
  }

  if (isDifferent(previous.applicationFee, extracted.application_fee)) {
    changes.push(makeChange("applicationFee", previous.applicationFee, extracted.application_fee));
  }

  const hasChanges = changes.length > 0;
  const summary = hasChanges
    ? `${changes.length} field(s) changed: ${changes.map((c) => c.field).join(", ")}`
    : "No changes detected";

  log.info(`Diff result`, { hasChanges, summary });
  if (hasChanges) {
    changes.forEach((c) => log.debug(`Field diff`, c));
  }

  return { hasChanges, changes, summary };
}
