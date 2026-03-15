import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { stepResults } from "@/lib/db/pipeline-schema";

export async function recordStepRunning(runId: string, nodeId: string) {
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
}

export async function recordStepCompleted(
  runId: string,
  nodeId: string,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  durationMs: number,
) {
  await db
    .update(stepResults)
    .set({
      status: "completed",
      input,
      output,
      durationMs: Math.round(durationMs),
      completedAt: new Date(),
    })
    .where(
      and(eq(stepResults.runId, runId), eq(stepResults.nodeId, nodeId)),
    );
}

export async function recordStepFailed(
  runId: string,
  nodeId: string,
  input: Record<string, unknown>,
  error: unknown,
  durationMs: number,
) {
  const serializedError =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };

  await db
    .update(stepResults)
    .set({
      status: "failed",
      input,
      error: serializedError,
      durationMs: Math.round(durationMs),
      completedAt: new Date(),
    })
    .where(
      and(eq(stepResults.runId, runId), eq(stepResults.nodeId, nodeId)),
    );
}
