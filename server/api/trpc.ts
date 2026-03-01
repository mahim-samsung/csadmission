/**
 * tRPC initialisation — base router, public procedure, and (stub) protected procedure.
 *
 * Split into:
 *   - `createTRPCContext`  → called once per request; injects db + auth
 *   - `t`                 → tRPC instance with SuperJSON transformer
 *   - `createTRPCRouter`  → typed router factory
 *   - `publicProcedure`   → unauthenticated procedure
 *   - `protectedProcedure`→ procedure that requires a valid session (stub)
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";

const log = logger.child("trpc");

// ── Context ───────────────────────────────────────

export interface CreateContextOptions {
  headers: Headers;
  req?: NextRequest;
}

/**
 * Creates the inner context shared across every request.
 * Add authentication / session resolution here when ready.
 */
export async function createTRPCContext(opts: CreateContextOptions) {
  return {
    db,
    headers: opts.headers,
    // session: await getServerSession(opts),  ← add when auth is wired
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// ── tRPC instance ─────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ── Middleware ────────────────────────────────────

/** Logs every procedure call with its execution time. */
const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;

  if (result.ok) {
    log.debug(`${type} ${path} OK (${durationMs}ms)`);
  } else {
    log.warn(`${type} ${path} ERR (${durationMs}ms)`, {
      code: result.error.code,
    });
  }

  return result;
});

/** Stub auth guard — extend when authentication is implemented. */
const enforceAuthenticated = t.middleware(({ ctx, next }) => {
  // Replace this check once a real session is attached to the context.
  const isAuthenticated = false as boolean;

  if (!isAuthenticated) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx });
});

// ── Exports ───────────────────────────────────────

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/** Open to all callers. */
export const publicProcedure = t.procedure.use(loggerMiddleware);

/** Requires a valid session — stub, always throws UNAUTHORIZED for now. */
export const protectedProcedure = t.procedure
  .use(loggerMiddleware)
  .use(enforceAuthenticated);
