import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  pipelines,
  pipelineNodes,
  pipelineEdges,
} from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import { validateGraph } from "@/lib/pipeline/graph-validation";
import { validateNodeSlugs } from "@/lib/pipeline/validate-slugs";
import { eq, and, ne, notInArray, inArray } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id, true);
  if ("error" in result) return result.error;

  const { pipeline } = result;

  const nodes = pipeline.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: n.positionX, y: n.positionY },
    data: { label: n.label, slug: n.slug, config: n.config },
  }));

  const edges = pipeline.edges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    sourceHandle: e.sourceHandle,
    target: e.targetNodeId,
    targetHandle: e.targetHandle,
    label: e.label,
  }));

  return NextResponse.json({
    ...pipeline,
    triggerSchema: pipeline.triggerSchema ?? {},
    nodes,
    edges,
  });
}

const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "api_request",
    "ai_sdk",
    "sandbox",
    "condition",
    "transform",
    "metric_capture",
    "human_review",
    "trigger",
  ]),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    label: z.string().nullable().optional(),
    slug: z.string().nullable().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  }),
});

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  sourceHandle: z.string().nullable().optional(),
  target: z.string().min(1),
  targetHandle: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
});

const updatePipelineSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  triggerSchema: z.record(z.string(), z.unknown()).optional(),
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id, { write: true });
  if ("error" in result) return result.error;

  const parsed = updatePipelineSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { name, description, triggerSchema, nodes, edges } = parsed.data;

  const validationNodes = nodes.map((n) => ({
    id: n.id,
    type: n.type,
    config: n.data.config,
  }));
  const validationEdges = edges.map((e) => ({
    id: e.id,
    sourceNodeId: e.source,
    sourceHandle: e.sourceHandle ?? null,
    targetNodeId: e.target,
    targetHandle: e.targetHandle ?? null,
  }));

  const validation = validateGraph(validationNodes, validationEdges);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Invalid graph", details: validation.errors },
      { status: 400 },
    );
  }

  const slugErrors = validateNodeSlugs(
    nodes.map((n) => ({ id: n.id, slug: n.data.slug ?? null })),
  );
  if (slugErrors.length > 0) {
    return NextResponse.json(
      { error: "Invalid node slugs", details: slugErrors },
      { status: 400 },
    );
  }

  const incomingNodeIds = nodes.map((n) => n.id);
  const incomingEdgeIds = edges.map((e) => e.id);

  const [nodeConflicts, edgeConflicts] = await Promise.all([
    incomingNodeIds.length > 0
      ? db
          .select({ id: pipelineNodes.id })
          .from(pipelineNodes)
          .where(
            and(
              inArray(pipelineNodes.id, incomingNodeIds),
              ne(pipelineNodes.pipelineId, id),
            ),
          )
      : Promise.resolve([]),
    incomingEdgeIds.length > 0
      ? db
          .select({ id: pipelineEdges.id })
          .from(pipelineEdges)
          .where(
            and(
              inArray(pipelineEdges.id, incomingEdgeIds),
              ne(pipelineEdges.pipelineId, id),
            ),
          )
      : Promise.resolve([]),
  ]);

  if (nodeConflicts.length > 0) {
    return NextResponse.json(
      {
        error: "Node IDs conflict with another pipeline",
        ids: nodeConflicts.map((c) => c.id),
      },
      { status: 409 },
    );
  }

  if (edgeConflicts.length > 0) {
    return NextResponse.json(
      {
        error: "Edge IDs conflict with another pipeline",
        ids: edgeConflicts.map((c) => c.id),
      },
      { status: 409 },
    );
  }

  await db.transaction(async (tx) => {
    if (
      name !== undefined ||
      description !== undefined ||
      triggerSchema !== undefined
    ) {
      await tx
        .update(pipelines)
        .set({
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(triggerSchema !== undefined ? { triggerSchema } : {}),
        })
        .where(eq(pipelines.id, id));
    }

    if (incomingEdgeIds.length > 0) {
      await tx
        .delete(pipelineEdges)
        .where(
          and(
            eq(pipelineEdges.pipelineId, id),
            notInArray(pipelineEdges.id, incomingEdgeIds),
          ),
        );
    } else {
      await tx
        .delete(pipelineEdges)
        .where(eq(pipelineEdges.pipelineId, id));
    }

    if (incomingNodeIds.length > 0) {
      await tx
        .delete(pipelineNodes)
        .where(
          and(
            eq(pipelineNodes.pipelineId, id),
            notInArray(pipelineNodes.id, incomingNodeIds),
          ),
        );
    } else {
      await tx
        .delete(pipelineNodes)
        .where(eq(pipelineNodes.pipelineId, id));
    }

    for (const node of nodes) {
      await tx
        .insert(pipelineNodes)
        .values({
          id: node.id,
          pipelineId: id,
          type: node.type,
          label: node.data.label ?? null,
          slug: node.data.slug ?? null,
          config: (node.data.config as Record<string, unknown>) ?? {},
          positionX: node.position.x,
          positionY: node.position.y,
        })
        .onConflictDoUpdate({
          target: pipelineNodes.id,
          set: {
            type: node.type,
            label: node.data.label ?? null,
            slug: node.data.slug ?? null,
            config: (node.data.config as Record<string, unknown>) ?? {},
            positionX: node.position.x,
            positionY: node.position.y,
          },
          where: eq(pipelineNodes.pipelineId, id),
        });
    }

    for (const edge of edges) {
      await tx
        .insert(pipelineEdges)
        .values({
          id: edge.id,
          pipelineId: id,
          sourceNodeId: edge.source,
          sourceHandle: edge.sourceHandle ?? null,
          targetNodeId: edge.target,
          targetHandle: edge.targetHandle ?? null,
          label: edge.label ?? null,
        })
        .onConflictDoUpdate({
          target: pipelineEdges.id,
          set: {
            sourceNodeId: edge.source,
            sourceHandle: edge.sourceHandle ?? null,
            targetNodeId: edge.target,
            targetHandle: edge.targetHandle ?? null,
            label: edge.label ?? null,
          },
          where: eq(pipelineEdges.pipelineId, id),
        });
    }
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id, { write: true });
  if ("error" in result) return result.error;

  await db.delete(pipelines).where(eq(pipelines.id, id));

  return new Response(null, { status: 204 });
}
