import type { PipelineGraph, WalkerEdge } from "./graph-loader";

/**
 * Tracks which branches are active after condition nodes evaluate.
 * Used by the walker to decide which downstream nodes to enqueue.
 */
export class BranchResolver {
  /**
   * Maps condition node ID → the active output handle (e.g. "true" or "false").
   */
  private activeHandles = new Map<string, string>();

  /**
   * Records which branch a condition node selected.
   */
  recordConditionResult(nodeId: string, branch: string) {
    this.activeHandles.set(nodeId, branch);
  }

  /**
   * Determines whether a node is ready to execute.
   * A node is ready when ALL of its active incoming edges have completed sources.
   *
   * An incoming edge is "active" if:
   * - Its source is NOT a condition node (always active), OR
   * - Its source IS a condition node AND the edge's sourceHandle matches the active branch
   *
   * An incoming edge is "inactive" (can be ignored) if:
   * - Its source IS a condition node AND the edge's sourceHandle does NOT match the active branch
   */
  isNodeReady(
    nodeId: string,
    graph: PipelineGraph,
    completedNodes: Set<string>,
  ): boolean {
    const incomingEdges = graph.incoming.get(nodeId) ?? [];

    if (incomingEdges.length === 0) return true;

    const activeEdges = incomingEdges.filter((edge) =>
      this.isEdgeActive(edge, graph),
    );

    if (activeEdges.length === 0) return false;

    return activeEdges.every((edge) => completedNodes.has(edge.sourceNodeId));
  }

  /**
   * Checks whether a node is reachable via any active path.
   * A node on an inactive conditional branch should never be enqueued.
   */
  isNodeReachable(
    nodeId: string,
    graph: PipelineGraph,
    completedNodes: Set<string>,
  ): boolean {
    const incomingEdges = graph.incoming.get(nodeId) ?? [];

    if (incomingEdges.length === 0) return true;

    return incomingEdges.some(
      (edge) =>
        this.isEdgeActive(edge, graph) &&
        (completedNodes.has(edge.sourceNodeId) ||
          this.isNodeReachable(edge.sourceNodeId, graph, completedNodes)),
    );
  }

  /**
   * An edge is active if its source is not a condition node,
   * or if it is and the edge's handle matches the active branch.
   */
  private isEdgeActive(edge: WalkerEdge, graph: PipelineGraph): boolean {
    const sourceNode = graph.nodeMap.get(edge.sourceNodeId);
    if (!sourceNode || sourceNode.type !== "condition") return true;

    const activeBranch = this.activeHandles.get(edge.sourceNodeId);
    if (activeBranch === undefined) return true;

    return edge.sourceHandle === activeBranch;
  }
}
