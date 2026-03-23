import { eq, or, isNull, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelines, pipelineTemplates } from "@/lib/db/pipeline-schema";

const DEFAULT_PAGE_LIMIT = 200;

export async function getPipelinesForOrg(
  organizationId: string,
  pagination?: { limit: number; offset: number },
) {
  const limit = pagination?.limit ?? DEFAULT_PAGE_LIMIT;
  const offset = pagination?.offset ?? 0;

  return db.query.pipelines.findMany({
    where: eq(pipelines.organizationId, organizationId),
    orderBy: desc(pipelines.updatedAt),
    limit,
    offset,
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
      createdAt: pipelineTemplates.createdAt,
      updatedAt: pipelineTemplates.updatedAt,
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
