import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelines } from "@/lib/db/pipeline-schema";

export async function getPipelinesForOrg(organizationId: string) {
  return db.query.pipelines.findMany({
    where: eq(pipelines.organizationId, organizationId),
    orderBy: desc(pipelines.updatedAt),
  });
}

export type PipelineSummary = Awaited<
  ReturnType<typeof getPipelinesForOrg>
>[number];
