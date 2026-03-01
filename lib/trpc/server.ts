import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { headers } from "next/headers";
import { cache } from "react";
import { createCallerFactory, createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";
import { createQueryClient } from "@/lib/trpc/query-client";

/**
 * One QueryClient per request — cached inside the React request scope via `cache()`.
 */
const getQueryClient = cache(createQueryClient);

const callerFactory = createCallerFactory(appRouter);

/**
 * `createHydrationHelpers` expects a synchronous caller (or factory returning
 * one). We wrap the async context creation in a cache()-d function and pass
 * the factory itself — tRPC v11 resolves the context lazily.
 */
const createCaller = cache(async () => {
  const hdrs = await headers();
  const ctx = await createTRPCContext({ headers: hdrs });
  return callerFactory(ctx);
});

export const { trpc: api, HydrateClient } = createHydrationHelpers<typeof appRouter>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createCaller as any,
  getQueryClient,
);
