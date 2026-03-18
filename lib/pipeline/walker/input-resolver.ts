import type { StepInput } from "../types";
import type { PipelineGraph, WalkerNode } from "./graph-loader";

/**
 * Builds a StepInput for a node by gathering the outputs of all upstream
 * nodes and including the original trigger payload.
 *
 * Each upstream result is keyed by both node ID and label (when present)
 * so that dot-paths authored with either reference style resolve correctly.
 * Auto-wire generates label-based paths (e.g. `steps.llm.text`), while
 * hand-written configs may use the node ID.
 */
export function resolveInputs(
  node: WalkerNode,
  graph: PipelineGraph,
  results: Map<string, Record<string, unknown>>,
  triggerPayload: Record<string, unknown>,
): StepInput {
  const steps: Record<string, Record<string, unknown>> = {};

  const incomingEdges = graph.incoming.get(node.id) ?? [];
  for (const edge of incomingEdges) {
    const sourceOutput = results.get(edge.sourceNodeId);
    if (sourceOutput) {
      steps[edge.sourceNodeId] = sourceOutput;

      const sourceNode = graph.nodeMap.get(edge.sourceNodeId);
      if (sourceNode?.label) {
        steps[sourceNode.label] = sourceOutput;
      }
    }
  }

  return {
    steps,
    trigger: triggerPayload,
  };
}
