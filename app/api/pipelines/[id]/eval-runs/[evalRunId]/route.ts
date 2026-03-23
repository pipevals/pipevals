import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { evalRuns, pipelineRuns } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";
import { deriveEvalRunStatus } from "@/lib/pipeline/eval-run-status";

type RouteParams = { params: Promise<{ id: string; evalRunId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
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

  const evalRunFilter = eq(pipelineRuns.evalRunId, evalRunId);

  // Lightweight query for status derivation — only the status column, all rows
  const allStatuses = await db
    .select({ status: pipelineRuns.status })
    .from(pipelineRuns)
    .where(evalRunFilter);

  // Derive and update status
  const derived = deriveEvalRunStatus(allStatuses);
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

  // Paginated query for the response — full columns, limited rows
  const { limit, offset } = parsePagination(new URL(request.url));

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
    .where(evalRunFilter)
    .orderBy(desc(pipelineRuns.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    ...evalRun,
    status: derived.status,
    completedItems: derived.completedItems,
    failedItems: derived.failedItems,
    runs,
  });
}
