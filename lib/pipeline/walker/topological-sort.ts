import type { PipelineGraph, WalkerNode } from "./graph-loader";

/**
 * Produces a level-grouped topological ordering using Kahn's algorithm.
 * Each level contains nodes that can execute in parallel (all their
 * dependencies are in earlier levels).
 *
 * @returns Array of levels, where each level is an array of nodes.
 */
export function topologicalSort(graph: PipelineGraph): WalkerNode[][] {
  const inDegree = new Map<string, number>();

  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
  }

  for (const edge of graph.edges) {
    inDegree.set(
      edge.targetNodeId,
      (inDegree.get(edge.targetNodeId) ?? 0) + 1,
    );
  }

  let currentLevel: WalkerNode[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      currentLevel.push(graph.nodeMap.get(nodeId)!);
    }
  }

  const levels: WalkerNode[][] = [];

  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    const nextLevel: WalkerNode[] = [];

    for (const node of currentLevel) {
      for (const edge of graph.outgoing.get(node.id) ?? []) {
        const newDegree = inDegree.get(edge.targetNodeId)! - 1;
        inDegree.set(edge.targetNodeId, newDegree);
        if (newDegree === 0) {
          nextLevel.push(graph.nodeMap.get(edge.targetNodeId)!);
        }
      }
    }

    currentLevel = nextLevel;
  }

  return levels;
}
