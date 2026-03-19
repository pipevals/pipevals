import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  pipelines,
  pipelineNodes,
  pipelineEdges,
  pipelineTemplates,
} from "@/lib/db/pipeline-schema";
import type { PipelineNodeType } from "@/lib/pipeline/types";
import { requireAuth } from "@/lib/api/auth";
import { getPipelinesForOrg } from "@/lib/api/pipelines";
import { eq, and, or, isNull } from "drizzle-orm";
import { slugify } from "@/lib/slugify";

export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const result = await getPipelinesForOrg(authResult.organizationId);
  return NextResponse.json(result);
}

const createPipelineSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  templateId: z.string().optional(),
});

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { userId, organizationId } = authResult;

  const parsed = createPipelineSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }
  const { name, description, templateId } = parsed.data;
  const baseSlug = slugify(name);

  // If templateId is provided, fetch and verify visibility
  let template: typeof pipelineTemplates.$inferSelect | null = null;
  if (templateId) {
    const found = await db.query.pipelineTemplates.findFirst({
      where: and(
        eq(pipelineTemplates.id, templateId),
        or(
          isNull(pipelineTemplates.organizationId),
          eq(pipelineTemplates.organizationId, organizationId),
        ),
      ),
    });
    if (!found) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }
    template = found;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [pipeline] = await tx
        .insert(pipelines)
        .values({
          name: name.trim(),
          slug: baseSlug,
          description: description ?? null,
          triggerSchema: template?.triggerSchema ?? {},
          organizationId,
          createdBy: userId,
        })
        .returning();

      if (template) {
        const snapshot = template.graphSnapshot as {
          nodes: Array<Record<string, unknown>>;
          edges: Array<Record<string, unknown>>;
        };

        // Build oldId → newId map for nodes
        const idMap: Record<string, string> = Object.fromEntries(
          snapshot.nodes.map((n) => [n.id as string, crypto.randomUUID()]),
        );

        if (snapshot.nodes.length > 0) {
          await tx.insert(pipelineNodes).values(
            snapshot.nodes.map((n) => ({
              id: idMap[n.id as string],
              pipelineId: pipeline.id,
              type: n.type as PipelineNodeType,
              label: (n.label as string) ?? null,
              config: (n.config as Record<string, unknown>) ?? {},
              positionX: n.positionX as number,
              positionY: n.positionY as number,
            })),
          );
        }

        if (snapshot.edges.length > 0) {
          await tx.insert(pipelineEdges).values(
            snapshot.edges.map((e) => {
              const sourceNodeId = idMap[e.sourceNodeId as string];
              const targetNodeId = idMap[e.targetNodeId as string];
              if (!sourceNodeId || !targetNodeId) {
                throw new Error("Template snapshot has dangling edge reference");
              }
              return {
                id: crypto.randomUUID(),
                pipelineId: pipeline.id,
                sourceNodeId,
                sourceHandle: (e.sourceHandle as string) ?? null,
                targetNodeId,
                targetHandle: (e.targetHandle as string) ?? null,
              };
            }),
          );
        }
      }

      return pipeline;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const cause = err instanceof Error ? (err.cause as Record<string, unknown> | undefined) : undefined;
    const constraint =
      (err as Record<string, unknown>).constraint_name ??
      (err as Record<string, unknown>).constraint ??
      cause?.constraint_name ??
      cause?.constraint;
    if (constraint === "pipeline_slug_org_uidx") {
      return NextResponse.json(
        { error: `A pipeline with this slug already exists in this organization` },
        { status: 409 },
      );
    }
    throw err;
  }
}
