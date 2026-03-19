import { eq, or, isNull, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelines, pipelineTemplates } from "@/lib/db/pipeline-schema";

export async function getPipelinesForOrg(organizationId: string) {
  return db.query.pipelines.findMany({
    where: eq(pipelines.organizationId, organizationId),
    orderBy: desc(pipelines.updatedAt),
  });
}

export type PipelineSummary = Awaited<
  ReturnType<typeof getPipelinesForOrg>
>[number];

export async function getTemplatesForOrg(organizationId: string) {
  return db
    .select({
      id: pipelineTemplates.id,
      name: pipelineTemplates.name,
      slug: pipelineTemplates.slug,
      description: pipelineTemplates.description,
      organizationId: pipelineTemplates.organizationId,
    })
    .from(pipelineTemplates)
    .where(
      or(
        isNull(pipelineTemplates.organizationId),
        eq(pipelineTemplates.organizationId, organizationId),
      ),
    )
    .orderBy(asc(pipelineTemplates.name));
}

export type TemplateSummary = Awaited<
  ReturnType<typeof getTemplatesForOrg>
>[number];
