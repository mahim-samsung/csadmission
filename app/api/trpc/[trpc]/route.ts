import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { logger } from "@/lib/logger";

const log = logger.child("trpc:handler");

function handler(req: NextRequest) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        headers: req.headers,
        req,
      }),
    onError({ path, error }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        log.error(`Unhandled error on tRPC route /${path}`, {
          message: error.message,
          stack: error.stack,
        });
      }
    },
  });
}

export { handler as GET, handler as POST };
