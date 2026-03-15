import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelines, pipelineRuns } from "@/lib/db/pipeline-schema";
import { requireAuth } from "@/lib/api/auth";
import { start } from "workflow/api";
import { runPipelineWorkflow } from "@/lib/pipeline/walker/workflow";

type RouteParams = { params: Promise<{ id: string }> };

const triggerSchema = z
  .object({
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .optional();

export async function POST(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { organizationId } = authResult;

  const { id } = await params;

  const pipeline = await db.query.pipelines.findFirst({
    where: and(
      eq(pipelines.id, id),
      eq(pipelines.organizationId, organizationId),
    ),
    with: {
      nodes: true,
      edges: true,
    },
  });

  if (!pipeline) {
    return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
  }

  if (pipeline.nodes.length === 0) {
    return NextResponse.json(
      { error: "Pipeline has no nodes to execute" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = triggerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const triggerPayload = parsed.data?.payload ?? {};

  const graphSnapshot = {
    nodes: pipeline.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      config: n.config,
      positionX: n.positionX,
      positionY: n.positionY,
    })),
    edges: pipeline.edges.map((e) => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      sourceHandle: e.sourceHandle,
      targetNodeId: e.targetNodeId,
      targetHandle: e.targetHandle,
      label: e.label,
    })),
  };

  const [run] = await db
    .insert(pipelineRuns)
    .values({
      pipelineId: id,
      status: "pending",
      triggerPayload,
      graphSnapshot,
    })
    .returning({ id: pipelineRuns.id });

  const workflowRun = await start(runPipelineWorkflow, [run.id]);

  await db
    .update(pipelineRuns)
    .set({ workflowRunId: workflowRun.runId })
    .where(eq(pipelineRuns.id, run.id));

  return NextResponse.json({ runId: run.id }, { status: 202 });
}

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { organizationId } = authResult;

  const { id } = await params;

  const pipeline = await db.query.pipelines.findFirst({
    where: and(
      eq(pipelines.id, id),
      eq(pipelines.organizationId, organizationId),
    ),
  });

  if (!pipeline) {
    return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
  }

  const runs = await db
    .select({
      id: pipelineRuns.id,
      status: pipelineRuns.status,
      triggerPayload: pipelineRuns.triggerPayload,
      startedAt: pipelineRuns.startedAt,
      completedAt: pipelineRuns.completedAt,
      createdAt: pipelineRuns.createdAt,
    })
    .from(pipelineRuns)
    .where(eq(pipelineRuns.pipelineId, id))
    .orderBy(desc(pipelineRuns.createdAt));

  return NextResponse.json(runs);
}
