import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

// ── Shared admission payload ──────────────────────

/**
 * All editable fields of CsPhdAdmission.
 * Used by both create (inside upsert) and update paths.
 */
export const AdmissionPayloadSchema = z.object({
  deadline: z.coerce.date().optional(),

  greRequired: z.boolean().optional(),
  ieltsRequired: z.boolean().optional(),

  /** IELTS overall band score, typically 6.0 – 9.0 */
  ieltsScore: z
    .number()
    .min(0)
    .max(9)
    .multipleOf(0.5)
    .optional(),

  /** TOEFL iBT total score, typically 0 – 120 */
  toeflScore: z.number().int().min(0).max(120).optional(),

  /** Application fee in USD */
  applicationFee: z.number().int().min(0).max(10_000).optional(),

  /** ISO date-time string or Date of last data verification */
  lastVerifiedAt: z.coerce.date(),

  /**
   * Confidence score for the extracted data (0.0 – 1.0).
   * 1.0 = verified from official source, lower = scraped/inferred.
   */
  confidenceScore: z.number().min(0).max(1),

  /** Flag for manual review queue */
  needsReview: z.boolean().default(false),

  /** Raw HTML snapshot used for extraction — stored as TEXT */
  rawHtmlSnapshot: z.string().min(1),
});

export type AdmissionPayload = z.infer<typeof AdmissionPayloadSchema>;

// ── Upsert input ──────────────────────────────────

export const AdminUpsertAdmissionInputSchema = z.object({
  /**
   * The UUID of the parent University.
   * The procedure verifies the university exists before upserting.
   */
  universityId: z.string().uuid("universityId must be a valid UUID"),

  /**
   * When provided, update the existing record with this ID.
   * When omitted, a new CsPhdAdmission is created.
   *
   * This allows idempotent imports: callers that track the record ID
   * can safely re-submit the same payload to overwrite stale data.
   */
  admissionId: z.string().uuid("admissionId must be a valid UUID").optional(),

  data: AdmissionPayloadSchema,
});

export type AdminUpsertAdmissionInput = z.infer<
  typeof AdminUpsertAdmissionInputSchema
>;

// ── Router ────────────────────────────────────────

export const admissionRouter = createTRPCRouter({
  /**
   * Admin: create or update a CsPhdAdmission record for a university.
   *
   * Behaviour:
   *  - If `admissionId` is provided → updates that record (must belong to `universityId`)
   *  - If `admissionId` is omitted  → creates a new record under `universityId`
   *
   * In both cases the parent University existence is validated first.
   */
  adminUpsertAdmission: publicProcedure
    .input(AdminUpsertAdmissionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { universityId, admissionId, data } = input;

      // ── 1. Verify parent university exists ─────
      const university = await ctx.db.university.findUnique({
        where: { id: universityId },
        select: { id: true, name: true },
      });

      if (!university) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `University with id "${universityId}" not found`,
        });
      }

      // ── 2. Update path ─────────────────────────
      if (admissionId) {
        const existing = await ctx.db.csPhdAdmission.findUnique({
          where: { id: admissionId },
          select: { id: true, universityId: true },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `CsPhdAdmission with id "${admissionId}" not found`,
          });
        }

        // Prevent cross-university reassignment
        if (existing.universityId !== universityId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Admission record "${admissionId}" does not belong to university "${universityId}"`,
          });
        }

        const updated = await ctx.db.csPhdAdmission.update({
          where: { id: admissionId },
          data: {
            deadline: data.deadline ?? null,
            greRequired: data.greRequired ?? null,
            ieltsRequired: data.ieltsRequired ?? null,
            ieltsScore: data.ieltsScore ?? null,
            toeflScore: data.toeflScore ?? null,
            applicationFee: data.applicationFee ?? null,
            lastVerifiedAt: data.lastVerifiedAt,
            confidenceScore: data.confidenceScore,
            needsReview: data.needsReview,
            rawHtmlSnapshot: data.rawHtmlSnapshot,
          },
          include: { university: { select: { id: true, name: true, csRanking: true } } },
        });

        return { action: "updated" as const, admission: updated };
      }

      // ── 3. Create path ─────────────────────────
      const created = await ctx.db.csPhdAdmission.create({
        data: {
          universityId,
          deadline: data.deadline ?? null,
          greRequired: data.greRequired ?? null,
          ieltsRequired: data.ieltsRequired ?? null,
          ieltsScore: data.ieltsScore ?? null,
          toeflScore: data.toeflScore ?? null,
          applicationFee: data.applicationFee ?? null,
          lastVerifiedAt: data.lastVerifiedAt,
          confidenceScore: data.confidenceScore,
          needsReview: data.needsReview,
          rawHtmlSnapshot: data.rawHtmlSnapshot,
        },
        include: { university: { select: { id: true, name: true, csRanking: true } } },
      });

      return { action: "created" as const, admission: created };
    }),

  /**
   * List all admission records for a given university, newest first.
   */
  listByUniversity: publicProcedure
    .input(z.object({ universityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const records = await ctx.db.csPhdAdmission.findMany({
        where: { universityId: input.universityId },
        orderBy: { lastVerifiedAt: "desc" },
        include: { university: { select: { id: true, name: true } } },
      });

      return records;
    }),

  /**
   * Fetch a single admission record by its own ID.
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.csPhdAdmission.findUnique({
        where: { id: input.id },
        include: { university: true },
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `CsPhdAdmission with id "${input.id}" not found`,
        });
      }

      return record;
    }),

  /**
   * Mark an admission record as needing manual review.
   */
  flagForReview: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        needsReview: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.csPhdAdmission.findUnique({
        where: { id: input.id },
        select: { id: true },
      });

      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.csPhdAdmission.update({
        where: { id: input.id },
        data: { needsReview: input.needsReview },
        select: { id: true, needsReview: true, universityId: true },
      });
    }),
});
