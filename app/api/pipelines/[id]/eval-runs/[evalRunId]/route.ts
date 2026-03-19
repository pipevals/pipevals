import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { evalRuns, pipelineRuns } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import { deriveEvalRunStatus } from "@/lib/pipeline/eval-run-status";

type RouteParams = { params: Promise<{ id: string; evalRunId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id, evalRunId } = await params;
  const result = await requirePipeline(id);
  if ("error" in result) return result.error;

  const evalRun = await db.query.evalRuns.findFirst({
    where: and(eq(evalRuns.id, evalRunId), eq(evalRuns.pipelineId, id)),
  });

  if (!evalRun) {
    return NextResponse.json(
      { error: "Eval run not found" },
      { status: 404 },
    );
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
    .where(eq(pipelineRuns.evalRunId, evalRunId))
    .orderBy(desc(pipelineRuns.createdAt));

  // Derive and update status
  const derived = deriveEvalRunStatus(runs);
  if (
    derived.status !== evalRun.status ||
    derived.completedItems !== evalRun.completedItems ||
    derived.failedItems !== evalRun.failedItems
  ) {
    await db
      .update(evalRuns)
      .set({
        status: derived.status,
        completedItems: derived.completedItems,
        failedItems: derived.failedItems,
        completedAt: derived.status === "completed" || derived.status === "failed"
          ? evalRun.completedAt ?? new Date()
          : null,
      })
      .where(eq(evalRuns.id, evalRunId));
  }

  return NextResponse.json({
    ...evalRun,
    status: derived.status,
    completedItems: derived.completedItems,
    failedItems: derived.failedItems,
    runs,
  });
}
