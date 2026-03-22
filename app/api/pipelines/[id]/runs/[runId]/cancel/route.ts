import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getRun } from "workflow/api";
import { db } from "@/lib/db";
import { pipelineRuns, stepResults } from "@/lib/db/pipeline-schema";
import { requirePipeline } from "@/lib/api/auth";
import { isCancellableRunStatus } from "@/lib/stores/run-viewer";

type RouteParams = { params: Promise<{ id: string; runId: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const { id, runId } = await params;
  const result = await requirePipeline(id, { write: true });
  if ("error" in result) return result.error;

  const run = await db.query.pipelineRuns.findFirst({
    where: and(
      eq(pipelineRuns.id, runId),
      eq(pipelineRuns.pipelineId, id),
    ),
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (!isCancellableRunStatus(run.status)) {
    return NextResponse.json(
      { error: "Run is not cancellable" },
      { status: 409 },
    );
  }

  // Cancel the underlying workflow run
  if (run.workflowRunId) {
    try {
      const workflowRun = getRun(run.workflowRunId);
      await workflowRun.cancel();
    } catch {
      // Workflow may already be finished or not found — proceed with DB update
    }
  }

  const now = new Date();

  // Mark the run as cancelled and any in-flight steps as failed
  await Promise.all([
    db
      .update(pipelineRuns)
      .set({ status: "cancelled", completedAt: now })
      .where(eq(pipelineRuns.id, runId)),
    db
      .update(stepResults)
      .set({ status: "failed", completedAt: now })
      .where(
        and(
          eq(stepResults.runId, runId),
          eq(stepResults.status, "running"),
        ),
      ),
  ]);

  return NextResponse.json({ status: "cancelled" });
}
