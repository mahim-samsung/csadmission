import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

const log = logger.child("db");

function createPrismaClient() {
  return new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
    ],
  });
}

// Extend the global type so HMR in dev doesn't spawn multiple clients.
declare global {
  var __prisma: ReturnType<typeof createPrismaClient> | undefined;
}

export const db =
  globalThis.__prisma ??
  (() => {
    const client = createPrismaClient();

    client.$on("query", (e) => {
      log.debug("Query executed", {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    });

    client.$on("error", (e) => {
      log.error("Prisma error", { message: e.message, target: e.target });
    });

    client.$on("warn", (e) => {
      log.warn("Prisma warning", { message: e.message, target: e.target });
    });

    return client;
  })();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db;
}
