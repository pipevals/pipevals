import type { StepInput } from "../types";
import type { PipelineGraph, WalkerNode } from "./graph-loader";

/**
 * Builds a StepInput for a node by gathering the outputs of all upstream
 * nodes (keyed by their node ID) and including the original trigger payload.
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
    }
  }

  return {
    steps,
    trigger: triggerPayload,
  };
}
