import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { pipelineRuns, stepResults, tasks } from "@/lib/db/pipeline-schema";
import { resolveDotPath } from "@pipevals/workflow-walker";
import type { HookAdapter, StepInput, WalkerNode } from "@pipevals/workflow-walker";
import type { HumanReviewConfig } from "./types";
import { recordStepAwaitingReview } from "./walker/step-recorder";
import { reviewHook, type ReviewHookPayload } from "./walker/review-hook";

export const hookAdapter: HookAdapter = {
  shouldSuspend(node: WalkerNode): boolean {
    return node.type === "human_review";
  },

  async executeSuspendable(
    runId: string,
    node: WalkerNode,
    input: StepInput,
  ): Promise<Record<string, unknown>> {
    const config = node.config as unknown as HumanReviewConfig;
    const start = Date.now();
    const inputSnapshot = { steps: input.steps, trigger: input.trigger };

    // Phase 1 ("use step"): Create review tasks + mark awaiting_review
    const hookTokens = await createReviewTasks(
      runId,
      node.id,
      config,
      input,
      inputSnapshot,
    );

    // Phase 2 (workflow level): Create hooks and suspend
    const hooks = hookTokens.map((token) => reviewHook.create({ token }));
    const reviews: ReviewHookPayload[] = await Promise.all(hooks);

    // Phase 3 ("use step"): Aggregate and record completion
    const durationMs = Date.now() - start;
    const output = aggregateReviews(reviews, config);
    await recordHumanReviewCompleted(
      runId,
      node.id,
      inputSnapshot,
      output,
      durationMs,
    );

    return output;
  },
};

// --- "use step" functions for DB operations ---

async function createReviewTasks(
  runId: string,
  nodeId: string,
  config: HumanReviewConfig,
  input: StepInput,
  inputSnapshot: Record<string, unknown>,
): Promise<string[]> {
  "use step";

  const displayData = resolveDisplayData(config.display, input);

  const run = await db.query.pipelineRuns.findFirst({
    where: eq(pipelineRuns.id, runId),
    columns: { pipelineId: true },
  });
  if (!run) throw new Error(`Run "${runId}" not found`);

  const n = config.requiredReviewers ?? 1;
  const hookTokens = Array.from(
    { length: n },
    (_, i) => `review:${runId}:${nodeId}:${i}`,
  );

  await db
    .insert(tasks)
    .values(
      hookTokens.map((hookToken, i) => ({
        pipelineId: run.pipelineId,
        runId,
        nodeId,
        hookToken,
        status: "pending" as const,
        rubric: config.rubric as Record<string, unknown>[],
        displayData,
        reviewerIndex: i,
      })),
    )
    .onConflictDoNothing({ target: [tasks.hookToken] });

  await recordStepAwaitingReview(runId, nodeId, inputSnapshot);

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

  await Promise.all([
    db
      .update(stepResults)
      .set({
        status: "completed",
        input: inputSnapshot,
        output,
        durationMs: Math.round(durationMs),
        completedAt: new Date(),
      })
      .where(and(eq(stepResults.runId, runId), eq(stepResults.nodeId, nodeId))),
    db
      .update(pipelineRuns)
      .set({ status: "running" })
      .where(eq(pipelineRuns.id, runId)),
  ]);
}

// --- Pure helpers ---

function resolveDisplayData(
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

function aggregateReviews(
  reviews: ReviewHookPayload[],
  config: HumanReviewConfig,
): Record<string, unknown> {
  const ratingFields = config.rubric
    .filter((f) => f.type === "rating")
    .map((f) => f.name);

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
