import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineRuns } from "@/lib/db/pipeline-schema";

export async function markRunRunning(runId: string) {
  await db
    .update(pipelineRuns)
    .set({
      status: "running",
      startedAt: new Date(),
    })
    .where(eq(pipelineRuns.id, runId));
}

export async function markRunCompleted(runId: string) {
  await db
    .update(pipelineRuns)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(pipelineRuns.id, runId));
}

export async function markRunFailed(runId: string) {
  const now = new Date();
  await db
    .update(pipelineRuns)
    .set({
      status: "failed",
      startedAt: sql`COALESCE(${pipelineRuns.startedAt}, ${now})`,
      completedAt: now,
    })
    .where(eq(pipelineRuns.id, runId));
}
