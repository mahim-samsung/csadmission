import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const crawlerRouter = createTRPCRouter({
  listJobs: publicProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "RUNNING", "DONE", "FAILED"]).optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { status, page, limit } = input;
      const skip = (page - 1) * limit;
      const where = status ? { status } : {};

      const [items, total] = await ctx.db.$transaction([
        ctx.db.crawlJob.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { university: { select: { name: true } } },
        }),
        ctx.db.crawlJob.count({ where }),
      ]);

      return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    }),

  getJob: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.crawlJob.findUnique({
        where: { id: input.id },
        include: {
          university: { select: { name: true, website: true } },
          pages: { select: { id: true, url: true, title: true, scrapedAt: true } },
        },
      });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Crawl job not found" });
      }

      return job;
    }),

  enqueue: publicProcedure
    .input(
      z.object({
        targetUrl: z.string().url(),
        universityId: z.string().cuid().optional(),
        maxDepth: z.number().int().min(1).max(10).default(2),
        maxPages: z.number().int().min(1).max(500).default(12),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.crawlJob.create({ data: input });
    }),

  cancel: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.crawlJob.findUnique({ where: { id: input.id } });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (job.status !== "PENDING" && job.status !== "RUNNING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel a job with status ${job.status}`,
        });
      }

      return ctx.db.crawlJob.update({
        where: { id: input.id },
        data: { status: "FAILED", errorMessage: "Cancelled by user" },
      });
    }),
});
