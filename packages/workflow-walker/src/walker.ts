import { loadGraph } from "./core/graph-loader";
import type { WalkerNode } from "./core/graph-loader";
import { topologicalSort } from "./core/topological-sort";
import { resolveInputs } from "./core/input-resolver";
import { BranchResolver } from "./core/branch-resolver";
import type { WalkerConfig, StepInput } from "./types";

/**
 * Creates a pipeline orchestration function.
 *
 * The returned function does NOT carry `"use workflow"` — the consumer must
 * wrap it in their own exported function with that directive.
 *
 * Step boundaries are provided by the consumer's adapters and handlers:
 * - PersistenceAdapter methods should carry `"use step"`
 * - StepRegistry handlers should carry `"use step"`
 * - HookAdapter.executeSuspendable runs at workflow level (for hook suspension)
 *
 * @example
 * ```ts
 * const orchestrate = createWalker({ persistence, steps, hooks });
 *
 * export async function runPipeline(runId: string) {
 *   "use workflow";
 *   return orchestrate(runId);
 * }
 *
 * // In API route:
 * await start(runPipeline, [runId]);
 * ```
 */
export function createWalker(config: WalkerConfig) {
  const { persistence, steps, hooks } = config;

  return async function orchestrate(
    runId: string,
  ): Promise<Record<string, Record<string, unknown>>> {
    const { graphSnapshot, triggerPayload } = await persistence.loadRunData(runId);
    await persistence.updateRunStatus(runId, "running");

    const graph = loadGraph(graphSnapshot);
    const levels = topologicalSort(graph);

    const results = new Map<string, Record<string, unknown>>();
    const completedNodes = new Set<string>();
    const branchingTypes = new Set(
      Object.entries(steps)
        .filter(([, entry]) => entry.branches)
        .map(([type]) => type),
    );
    const branchResolver = new BranchResolver(branchingTypes);

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

          if (hooks?.shouldSuspend(node)) {
            return hooks.executeSuspendable(runId, node, input);
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

          if (
            branchingTypes.has(node.type) &&
            typeof result.value.branch === "string"
          ) {
            branchResolver.recordBranchResult(
              node.id,
              result.value.branch,
            );
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

    async function executeNode(
      rId: string,
      nodeId: string,
      nodeType: string,
      nodeConfig: Record<string, unknown>,
      input: StepInput,
    ): Promise<Record<string, unknown>> {
      await persistence.recordStepRunning(rId, nodeId);
      const start = Date.now();
      const inputSnapshot = { steps: input.steps, trigger: input.trigger };

      try {
        const entry = steps[nodeType];
        if (!entry) {
          throw new Error(`Unknown step type "${nodeType}"`);
        }
        const output = await entry.handler(nodeConfig, input);
        const durationMs = Date.now() - start;
        await persistence.recordStepCompleted(
          rId,
          nodeId,
          inputSnapshot,
          output,
          durationMs,
        );
        return output;
      } catch (error) {
        const durationMs = Date.now() - start;
        await persistence.recordStepFailed(
          rId,
          nodeId,
          inputSnapshot,
          error,
          durationMs,
        );
        throw error;
      }
    }

    if (failed) {
      await persistence.updateRunStatus(runId, "failed");
      throw firstError;
    }

    await persistence.updateRunStatus(runId, "completed");
    return Object.fromEntries(results);
  };
}
