import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineRuns } from "@/lib/db/pipeline-schema";
import { stepRegistry } from "../steps/registry";
import type { StepInput, StepType } from "../types";
import {
  recordStepRunning,
  recordStepCompleted,
  recordStepFailed,
} from "./step-recorder";

export async function loadRunData(runId: string) {
  "use step";

  const run = await db.query.pipelineRuns.findFirst({
    where: eq(pipelineRuns.id, runId),
  });

  if (!run) throw new Error(`Pipeline run "${runId}" not found`);

  return {
    graphSnapshot: run.graphSnapshot as { nodes: unknown[]; edges: unknown[] },
    triggerPayload: (run.triggerPayload ?? {}) as Record<string, unknown>,
  };
}

export async function updateRunStatus(
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
}

export async function executeNode(
  runId: string,
  nodeId: string,
  nodeType: StepType,
  nodeConfig: Record<string, unknown>,
  input: StepInput,
): Promise<Record<string, unknown>> {
  "use step";

  await recordStepRunning(runId, nodeId);
  const start = performance.now();
  const inputSnapshot = { steps: input.steps, trigger: input.trigger };

  let output: Record<string, unknown>;
  let stepError: unknown;

  try {
    const handler = stepRegistry[nodeType];
    output = await handler(nodeConfig, input);
  } catch (error) {
    stepError = error;
  }

  const durationMs = performance.now() - start;

  if (stepError !== undefined) {
    await recordStepFailed(runId, nodeId, inputSnapshot, stepError, durationMs);
    throw stepError;
  }

  await recordStepCompleted(runId, nodeId, inputSnapshot, output!, durationMs);
  return output!;
}
