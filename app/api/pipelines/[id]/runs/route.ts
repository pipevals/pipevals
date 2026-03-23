import { NextResponse } from "next/server";
import { desc, eq, and, isNull, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineRuns } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import { parsePagination, paginatedResponse } from "@/lib/api/pagination";
import { start } from "workflow/api";
import { runPipelineWorkflow } from "@/lib/pipeline/walker/workflow";
import { buildTriggerValidator } from "@/lib/pipeline/utils/build-trigger-validator";
import { buildGraphSnapshot } from "@/lib/pipeline/build-graph-snapshot";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id, { withGraph: true, write: true, apiKey: true });
  if ("error" in result) return result.error;

  const graphSnapshot = buildGraphSnapshot(result.pipeline.nodes, result.pipeline.edges);
  if (!graphSnapshot) {
    return NextResponse.json(
      { error: "Pipeline has no nodes to execute" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const pipelineTriggerSchema = (result.pipeline.triggerSchema ?? {}) as Record<string, unknown>;
  const validator = buildTriggerValidator(pipelineTriggerSchema);
  const parsed = validator.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const triggerPayload = parsed.data;

  const [run] = await db
    .insert(pipelineRuns)
    .values({
      pipelineId: id,
      status: "pending",
      triggerPayload,
      graphSnapshot,
    })
    .returning({ id: pipelineRuns.id });

  try {
    const workflowRun = await start(runPipelineWorkflow, [run.id]);

    await db
      .update(pipelineRuns)
      .set({ workflowRunId: workflowRun.runId })
      .where(eq(pipelineRuns.id, run.id));
  } catch {
    await db
      .update(pipelineRuns)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(pipelineRuns.id, run.id));

    return NextResponse.json(
      { error: "Failed to start pipeline workflow", runId: run.id },
      { status: 502 },
    );
  }

  return NextResponse.json({ runId: run.id }, { status: 202 });
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const result = await requirePipeline(id);
  if ("error" in result) return result.error;

  const url = new URL(request.url);
  const evalRunId = url.searchParams.get("evalRunId");
  const { limit, offset } = parsePagination(url);

  const filter = evalRunId
    ? and(eq(pipelineRuns.pipelineId, id), eq(pipelineRuns.evalRunId, evalRunId))
    : and(eq(pipelineRuns.pipelineId, id), isNull(pipelineRuns.evalRunId));

  const [runs, [{ totalCount }]] = await Promise.all([
    db
      .select({
        id: pipelineRuns.id,
        status: pipelineRuns.status,
        triggerPayload: pipelineRuns.triggerPayload,
        startedAt: pipelineRuns.startedAt,
        completedAt: pipelineRuns.completedAt,
        createdAt: pipelineRuns.createdAt,
      })
      .from(pipelineRuns)
      .where(filter)
      .orderBy(desc(pipelineRuns.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ totalCount: count() })
      .from(pipelineRuns)
      .where(filter),
  ]);

  return paginatedResponse(runs, totalCount);
}
