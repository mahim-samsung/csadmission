import { z } from "zod";
import { type Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

// ── Shared input schemas ──────────────────────────

/**
 * Ranking range: both bounds are optional but, when provided, min ≤ max.
 */
const RankingRangeSchema = z
  .object({
    min: z.number().int().min(1).optional(),
    max: z.number().int().min(1).optional(),
  })
  .refine(
    (r) => {
      if (r.min !== undefined && r.max !== undefined) return r.min <= r.max;
      return true;
    },
    { message: "rankingRange.min must be ≤ rankingRange.max" },
  )
  .nullish();

export const GetUniversitiesInputSchema = z.object({
  /** Full-text search across name and state */
  search: z.string().trim().max(200).nullish(),

  /** Filter to universities where greRequired = true */
  greRequired: z.boolean().nullish(),

  /** Maximum IELTS overall band score (e.g. 6.0, 6.5, 7.0) */
  ieltsMin: z.number().min(0).max(9).nullish(),

  /** Maximum TOEFL iBT score (e.g. 70, 80, 90, 100) */
  toeflMax: z.number().int().min(0).max(120).nullish(),

  /** Filter by US state abbreviation or full name, case-insensitive */
  state: z.string().trim().max(100).nullish(),

  /** CS World Ranking range (inclusive on both ends) */
  rankingRange: RankingRangeSchema,

  /** Include the latest CsPhdAdmission record per university in the response */
  includeAdmissions: z.boolean().default(false),

  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(200).default(20),

  /** Sort field - optional, defaults to csRanking */
  orderBy: z
    .enum(["csRanking", "name", "createdAt"])
    .nullish(),
  orderDir: z.enum(["asc", "desc"]).default("asc"),
});

export type GetUniversitiesInput = z.infer<typeof GetUniversitiesInputSchema>;

// ── Router ────────────────────────────────────────

export const universityRouter = createTRPCRouter({
  /**
   * List universities with rich filtering.
   *
   * Filters:
   *  - search        → name / state ILIKE
   *  - greRequired   → joins CsPhdAdmission.greRequired
   *  - state         → exact (case-insensitive)
   *  - rankingRange  → csRanking BETWEEN min AND max
   */
  getUniversities: publicProcedure
    .input(GetUniversitiesInputSchema)
    .query(async ({ ctx, input }) => {
      const {
        search,
        greRequired,
        ieltsMin,
        toeflMax,
        state,
        rankingRange,
        includeAdmissions,
        page,
        limit,
        orderBy,
        orderDir,
      } = input;

      const skip = (page - 1) * limit;

      // ── Base where clause ──────────────────────
      const where: Prisma.UniversityWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { state: { contains: search, mode: "insensitive" } },
        ];
      }

      if (state) {
        where.state = { equals: state, mode: "insensitive" };
      }

      if (rankingRange?.min !== undefined || rankingRange?.max !== undefined) {
        where.csRanking = {
          ...(rankingRange.min !== undefined ? { gte: rankingRange.min } : {}),
          ...(rankingRange.max !== undefined ? { lte: rankingRange.max } : {}),
        };
      }

      // greRequired filter: join through admissions relation
      if (greRequired !== undefined && greRequired !== null) {
        where.admissions = {
          some: { greRequired },
        };
      }

      // IELTS maximum score filter: join through admissions relation
      if (ieltsMin !== undefined && ieltsMin !== null) {
        where.admissions = {
          ...(where.admissions ?? {}),
          some: {
            ...(typeof where.admissions === "object" &&
            "some" in where.admissions &&
            typeof where.admissions.some === "object"
              ? where.admissions.some
              : {}),
            ieltsScore: { lte: ieltsMin },
          },
        };
      }

      // TOEFL maximum score filter: join through admissions relation
      if (toeflMax !== undefined && toeflMax !== null) {
        where.admissions = {
          ...(where.admissions ?? {}),
          some: {
            ...(typeof where.admissions === "object" &&
            "some" in where.admissions &&
            typeof where.admissions.some === "object"
              ? where.admissions.some
              : {}),
            toeflScore: { lte: toeflMax },
          },
        };
      }

      // ── orderBy clause ─────────────────────────
      // If no orderBy specified, use csRanking as default for consistency
      const defaultOrderBy = "csRanking" as const;
      const finalOrderBy = orderBy ?? defaultOrderBy;
      
      const orderByClause: Prisma.UniversityOrderByWithRelationInput =
        finalOrderBy === "csRanking"
          ? { csRanking: orderDir }
          : finalOrderBy === "name"
          ? { name: orderDir }
          : { createdAt: orderDir };

      // ── Include clause ─────────────────────────
      const include: Prisma.UniversityInclude = includeAdmissions
        ? {
            admissions: {
              orderBy: { lastVerifiedAt: "desc" },
              take: 1,
            },
          }
        : {};

      const [items, total] = await ctx.db.$transaction([
        ctx.db.university.findMany({
          where,
          skip,
          take: limit,
          orderBy: orderByClause,
          include,
        }),
        ctx.db.university.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  /**
   * Fetch a single university by ID, always includes all admission records
   * ordered newest-first.
   */
  getUniversityById: publicProcedure
    .input(
      z.object({
        id: z.string().uuid("id must be a valid UUID"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const university = await ctx.db.university.findUnique({
        where: { id: input.id },
        include: {
          admissions: {
            orderBy: { lastVerifiedAt: "desc" },
          },
          programs: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!university) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `University with id "${input.id}" not found`,
        });
      }

      return university;
    }),
});
