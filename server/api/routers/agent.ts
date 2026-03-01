import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const agentRouter = createTRPCRouter({
  createSession: publicProcedure
    .input(
      z.object({
        title: z.string().optional(),
        userId: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.chatSession.create({
        data: {
          title: input.title,
          userId: input.userId,
          metadata: input.metadata
            ? (input.metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
    }),

  getSession: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.chatSession.findUnique({
        where: { id: input.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      return session;
    }),

  listSessions: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { userId, page, limit } = input;
      const skip = (page - 1) * limit;
      const where = userId ? { userId } : {};

      const [items, total] = await ctx.db.$transaction([
        ctx.db.chatSession.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: "desc" },
          include: { _count: { select: { messages: true } } },
        }),
        ctx.db.chatSession.count({ where }),
      ]);

      return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    }),

  sendMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.string().cuid(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.chatSession.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      // Persist the user message.
      const userMessage = await ctx.db.chatMessage.create({
        data: {
          sessionId: input.sessionId,
          role: "USER",
          content: input.content,
        },
      });

      // TODO: invoke the MCP agent pipeline here.
      // const response = await runAgent({ sessionId, message: input.content });

      return { userMessage };
    }),
});
