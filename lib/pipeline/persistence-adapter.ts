import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineRuns, stepResults } from "@/lib/db/pipeline-schema";
import type { PersistenceAdapter, GraphSnapshot } from "@pipevals/workflow-walker";

/**
 * Each method carries "use step" so the workflow builder places
 * database dependencies (postgres driver, drizzle) in the step bundle
 * rather than the workflow bundle.
 */
export const persistenceAdapter: PersistenceAdapter = {
  async loadRunData(runId: string) {
    "use step";
    const run = await db.query.pipelineRuns.findFirst({
      where: eq(pipelineRuns.id, runId),
    });

    if (!run) throw new Error(`Pipeline run "${runId}" not found`);

    return {
      graphSnapshot: run.graphSnapshot as GraphSnapshot,
      triggerPayload: (run.triggerPayload ?? {}) as Record<string, unknown>,
    };
  },

  async updateRunStatus(
    runId: string,
    status: "running" | "completed" | "failed",
  ) {
    "use step";
    const now = new Date();
    await db
      .update(pipelineRuns)
      .set({
        status,
        ...(status === "running" ? { startedAt: now } : { completedAt: now }),
      })
      .where(eq(pipelineRuns.id, runId));
  },

  async recordStepRunning(runId: string, nodeId: string) {
    "use step";
    await db
      .insert(stepResults)
      .values({
        runId,
        nodeId,
        status: "running",
        startedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [stepResults.runId, stepResults.nodeId],
        set: {
          status: "running",
        },
      });
  },

  async recordStepCompleted(
    runId: string,
    nodeId: string,
    input: unknown,
    output: unknown,
    durationMs: number,
  ) {
    "use step";
    await db
      .update(stepResults)
      .set({
        status: "completed",
        input: input as Record<string, unknown>,
        output: output as Record<string, unknown>,
        durationMs: Math.round(durationMs),
        completedAt: new Date(),
      })
      .where(
        and(eq(stepResults.runId, runId), eq(stepResults.nodeId, nodeId)),
      );
  },

  async recordStepFailed(
    runId: string,
    nodeId: string,
    input: unknown,
    error: unknown,
    durationMs: number,
  ) {
    "use step";
    const serializedError =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) };

    await db
      .update(stepResults)
      .set({
        status: "failed",
        input: input as Record<string, unknown>,
        error: serializedError,
        durationMs: Math.round(durationMs),
        completedAt: new Date(),
      })
      .where(
        and(eq(stepResults.runId, runId), eq(stepResults.nodeId, nodeId)),
      );
  },
};
