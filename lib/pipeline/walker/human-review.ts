import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineRuns, stepResults, tasks } from "@/lib/db/pipeline-schema";
import { resolveDotPath } from "../dot-path";
import type { HumanReviewConfig, StepInput } from "../types";
import { recordStepAwaitingReview } from "./step-recorder";
import { reviewHook, type ReviewHookPayload } from "./review-hook";

/**
 * Executes a human_review node at the **workflow level** (NOT inside "use step").
 *
 * Orchestration:
 * 1. Resolve display data + create task records  ("use step")
 * 2. Create N hooks and await them               (workflow level — suspends)
 * 3. Aggregate results and record completion      ("use step")
 */
export async function executeHumanReview(
  runId: string,
  nodeId: string,
  config: HumanReviewConfig,
  input: StepInput,
): Promise<Record<string, unknown>> {
  const start = Date.now();
  const inputSnapshot = { steps: input.steps, trigger: input.trigger };

  // Step 1: Resolve display data, create tasks, mark step as awaiting_review
  const hookTokens = await createReviewTasks(
    runId,
    nodeId,
    config,
    input,
    inputSnapshot,
  );

  // Step 2: Create hooks and suspend workflow (workflow-level, NOT a step)
  const hooks = hookTokens.map((token) => reviewHook.create({ token }));
  const reviews: ReviewHookPayload[] = await Promise.all(hooks);

  // Step 3: Aggregate and record completion
  const durationMs = Date.now() - start;
  const output = aggregateReviews(reviews, config);
  await recordHumanReviewCompleted(
    runId,
    nodeId,
    inputSnapshot,
    output,
    durationMs,
  );

  return output;
}

// --- "use step" functions for DB operations ---

async function createReviewTasks(
  runId: string,
  nodeId: string,
  config: HumanReviewConfig,
  input: StepInput,
  inputSnapshot: Record<string, unknown>,
): Promise<string[]> {
  "use step";

  // Resolve display data from dot-paths
  const displayData = resolveDisplayData(config.display, input);

  // Look up pipelineId from the run
  const run = await db.query.pipelineRuns.findFirst({
    where: eq(pipelineRuns.id, runId),
    columns: { pipelineId: true },
  });
  if (!run) throw new Error(`Run "${runId}" not found`);

  const n = config.requiredReviewers ?? 1;
  const hookTokens: string[] = [];

  // Create N task records. Tokens are deterministic so the workflow runtime
  // can match hooks on replay. onConflictDoNothing makes re-execution safe
  // if the step retries after tasks were already created.
  for (let i = 0; i < n; i++) {
    const hookToken = `review:${runId}:${nodeId}:${i}`;
    hookTokens.push(hookToken);

    await db
      .insert(tasks)
      .values({
        pipelineId: run.pipelineId,
        runId,
        nodeId,
        hookToken,
        status: "pending",
        rubric: config.rubric as Record<string, unknown>[],
        displayData,
        reviewerIndex: i,
      })
      .onConflictDoNothing({ target: [tasks.hookToken] });
  }

  // Mark step as awaiting_review
  await recordStepAwaitingReview(runId, nodeId, inputSnapshot);

  // Mark run as awaiting_review
  await db
    .update(pipelineRuns)
    .set({ status: "awaiting_review" })
    .where(eq(pipelineRuns.id, runId));

  return hookTokens;
}

async function recordHumanReviewCompleted(
  runId: string,
  nodeId: string,
  inputSnapshot: Record<string, unknown>,
  output: Record<string, unknown>,
  durationMs: number,
): Promise<void> {
  "use step";

  await db
    .update(stepResults)
    .set({
      status: "completed",
      input: inputSnapshot,
      output,
      durationMs: Math.round(durationMs),
      completedAt: new Date(),
    })
    .where(and(eq(stepResults.runId, runId), eq(stepResults.nodeId, nodeId)));

  // Restore run to running so the walker continues
  await db
    .update(pipelineRuns)
    .set({ status: "running" })
    .where(eq(pipelineRuns.id, runId));
}

// --- Pure helper functions ---

/**
 * Resolves display config dot-paths against the step input context.
 * Returns null for any paths that fail to resolve.
 */
export function resolveDisplayData(
  display: Record<string, string>,
  input: StepInput,
): Record<string, unknown> {
  const context = { steps: input.steps, trigger: input.trigger };
  const result: Record<string, unknown> = {};
  for (const [label, dotPath] of Object.entries(display)) {
    try {
      result[label] = resolveDotPath(context, dotPath);
    } catch {
      result[label] = null;
    }
  }
  return result;
}

// --- Pure aggregation logic ---

export function aggregateReviews(
  reviews: ReviewHookPayload[],
  config: HumanReviewConfig,
): Record<string, unknown> {
  const ratingFields = config.rubric
    .filter((f) => f.type === "rating")
    .map((f) => f.name);

  // Compute mean for each rating field
  const scores: Record<string, number> = {};
  for (const fieldName of ratingFields) {
    const values = reviews
      .map((r) => r.scores[fieldName])
      .filter((v): v is number => typeof v === "number");
    if (values.length > 0) {
      scores[fieldName] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  return {
    reviews: reviews.map((r) => ({
      reviewerId: r.reviewerId,
      reviewerIndex: r.reviewerIndex,
      scores: r.scores,
    })),
    scores,
  };
}
