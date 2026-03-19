import { loadRunData, updateRunStatus, executeNode } from "./steps";
import { loadGraph } from "./graph-loader";
import { topologicalSort } from "./topological-sort";
import { resolveInputs } from "./input-resolver";
import { BranchResolver } from "./branch-resolver";
import { executeHumanReview } from "./human-review";
import type { HumanReviewConfig } from "../types";
import type { WalkerNode } from "./graph-loader";

export async function runPipelineWorkflow(runId: string) {
  "use workflow";

  const { graphSnapshot, triggerPayload } = await loadRunData(runId);
  await updateRunStatus(runId, "running");

  const graph = loadGraph(graphSnapshot);
  const levels = topologicalSort(graph);

  const results = new Map<string, Record<string, unknown>>();
  const completedNodes = new Set<string>();
  const branchResolver = new BranchResolver();

  let failed = false;
  let firstError: unknown;

  for (const level of levels) {
    const readyNodes = level.filter(
      (node) =>
        branchResolver.isNodeReady(node.id, graph, completedNodes) &&
        branchResolver.isNodeReachable(node.id, graph, completedNodes),
    );

    if (readyNodes.length === 0) continue;

    const settled = await Promise.allSettled(
      readyNodes.map((node: WalkerNode) => {
        const input = resolveInputs(node, graph, results, triggerPayload);

        if (node.type === "human_review") {
          return executeHumanReview(
            runId,
            node.id,
            node.config as unknown as HumanReviewConfig,
            input,
          );
        }

        return executeNode(runId, node.id, node.type, node.config, input);
      }),
    );

    for (let i = 0; i < readyNodes.length; i++) {
      const node = readyNodes[i];
      const result = settled[i];

      if (result.status === "fulfilled") {
        results.set(node.id, result.value);
        completedNodes.add(node.id);

        if (node.type === "condition" && typeof result.value.branch === "string") {
          branchResolver.recordConditionResult(node.id, result.value.branch);
        }
      } else {
        if (!failed) {
          failed = true;
          firstError = result.reason;
        }
      }
    }

    if (failed) break;
  }

  if (failed) {
    await updateRunStatus(runId, "failed");
    throw firstError;
  }

  await updateRunStatus(runId, "completed");
  return Object.fromEntries(results);
}
