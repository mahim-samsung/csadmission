import { createTRPCRouter } from "@/server/api/trpc";
import { universityRouter } from "@/server/api/routers/university";
import { admissionRouter } from "@/server/api/routers/admission";
import { crawlerRouter } from "@/server/api/routers/crawler";
import { agentRouter } from "@/server/api/routers/agent";

/**
 * Root tRPC router — all sub-routers are merged here.
 *
 * Client usage examples:
 *   api.university.getUniversities.useQuery({ rankingRange: { min: 1, max: 50 } })
 *   api.university.getUniversityById.useQuery({ id: "..." })
 *   api.admission.adminUpsertAdmission.useMutation()
 *   api.admission.listByUniversity.useQuery({ universityId: "..." })
 */
export const appRouter = createTRPCRouter({
  university: universityRouter,
  admission: admissionRouter,
  crawler: crawlerRouter,
  agent: agentRouter,
});

export type AppRouter = typeof appRouter;
