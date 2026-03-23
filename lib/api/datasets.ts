import { eq, desc, asc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { datasets, datasetItems } from "@/lib/db/pipeline-schema";

export async function getDatasetsForOrg(
  organizationId: string,
  pagination?: { limit: number; offset: number },
) {
  let query = db
    .select({
      id: datasets.id,
      name: datasets.name,
      description: datasets.description,
      schema: datasets.schema,
      organizationId: datasets.organizationId,
      createdBy: datasets.createdBy,
      createdAt: datasets.createdAt,
      updatedAt: datasets.updatedAt,
      itemCount: count(datasetItems.id),
    })
    .from(datasets)
    .leftJoin(datasetItems, eq(datasetItems.datasetId, datasets.id))
    .where(eq(datasets.organizationId, organizationId))
    .groupBy(datasets.id)
    .orderBy(desc(datasets.createdAt))
    .$dynamic();

  if (pagination) {
    query = query.limit(pagination.limit).offset(pagination.offset);
  }

  return query;
}

export type DatasetSummary = Awaited<
  ReturnType<typeof getDatasetsForOrg>
>[number];

export async function getDatasetWithItems(datasetId: string) {
  const dataset = await db.query.datasets.findFirst({
    where: eq(datasets.id, datasetId),
  });
  if (!dataset) return null;

  const items = await db
    .select()
    .from(datasetItems)
    .where(eq(datasetItems.datasetId, datasetId))
    .orderBy(asc(datasetItems.index));

  return { ...dataset, items };
}

export type DatasetWithItems = NonNullable<
  Awaited<ReturnType<typeof getDatasetWithItems>>
>;

export type DatasetItem = DatasetWithItems["items"][number];
