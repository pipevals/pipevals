import { eq, and } from "drizzle-orm";
import { pipelines, pipelineNodes, pipelineEdges } from "./pipeline-schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

interface SeedNode {
  id: string;
  type: (typeof import("./pipeline-schema").pipelineNodeTypeEnum)[number];
  label: string;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
}

interface SeedEdge {
  id: string;
  sourceNodeId: string;
  sourceHandle: string | null;
  targetNodeId: string;
  targetHandle: string | null;
}

export interface SeedPipelineDefinition {
  name: string;
  slug: string;
  description: string;
  triggerSchema: Record<string, unknown>;
  nodes: SeedNode[];
  edges: SeedEdge[];
}

// Pipeline definitions will be added in tasks 2.x and 3.x
export const seedPipelineDefinitions: SeedPipelineDefinition[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = PostgresJsDatabase<any> | NodePgDatabase<any>;

export async function seedPipelines(
  db: AnyDb,
  organizationId: string,
  createdBy: string,
) {
  for (const def of seedPipelineDefinitions) {
    // Idempotency: skip if slug already exists in this org
    const existing = await (db as PostgresJsDatabase).select({ id: pipelines.id })
      .from(pipelines)
      .where(and(eq(pipelines.slug, def.slug), eq(pipelines.organizationId, organizationId)))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ⏭ Skipped "${def.name}" (already exists)`);
      continue;
    }

    await (db as PostgresJsDatabase).transaction(async (tx) => {
      const [pipeline] = await tx
        .insert(pipelines)
        .values({
          name: def.name,
          slug: def.slug,
          description: def.description,
          triggerSchema: def.triggerSchema,
          organizationId,
          createdBy,
        })
        .returning({ id: pipelines.id });

      if (def.nodes.length > 0) {
        await tx.insert(pipelineNodes).values(
          def.nodes.map((n) => ({
            id: n.id,
            pipelineId: pipeline.id,
            type: n.type,
            label: n.label,
            config: n.config,
            positionX: n.positionX,
            positionY: n.positionY,
          })),
        );
      }

      if (def.edges.length > 0) {
        await tx.insert(pipelineEdges).values(
          def.edges.map((e) => ({
            id: e.id,
            pipelineId: pipeline.id,
            sourceNodeId: e.sourceNodeId,
            sourceHandle: e.sourceHandle,
            targetNodeId: e.targetNodeId,
            targetHandle: e.targetHandle,
          })),
        );
      }

      console.log(`  ✔ Created "${def.name}" (${pipeline.id})`);
    });
  }
}
