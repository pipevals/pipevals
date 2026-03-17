import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineRuns } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import { start } from "workflow/api";
import { runPipelineWorkflow } from "@/lib/pipeline/walker/workflow";

type RouteParams = { params: Promise<{ id: string }> };

const triggerSchema = z
  .object({
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .optional();

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id, true);
  if ("error" in result) return result.error;

  const { nodes, edges } = result.pipeline;

  const executableNodes = nodes.filter((n) => n.type !== "trigger");
  const triggerNodeIds = new Set(
    nodes.filter((n) => n.type === "trigger").map((n) => n.id),
  );

  if (executableNodes.length === 0) {
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

  const triggerPayload =
    parsed.data?.payload ??
    (Object.keys(body).length > 0 ? (body as Record<string, unknown>) : {});

  const snapshotEdges = edges
    .filter(
      (e) =>
        !triggerNodeIds.has(e.sourceNodeId) &&
        !triggerNodeIds.has(e.targetNodeId),
    )
    .map((e) => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      sourceHandle: e.sourceHandle,
      targetNodeId: e.targetNodeId,
      targetHandle: e.targetHandle,
      label: e.label,
    }));

  const graphSnapshot = {
    nodes: executableNodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      config: n.config,
      positionX: n.positionX,
      positionY: n.positionY,
    })),
    edges: snapshotEdges,
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
  const { id } = await params;
  const result = await requirePipeline(id);
  if ("error" in result) return result.error;

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
