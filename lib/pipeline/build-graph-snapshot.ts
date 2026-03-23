interface NodeRow {
  id: string;
  type: string;
  label: string | null;
  slug: string | null;
  config: Record<string, unknown> | null;
  positionX: number;
  positionY: number;
}

interface EdgeRow {
  id: string;
  sourceNodeId: string;
  sourceHandle: string | null;
  targetNodeId: string;
  targetHandle: string | null;
  label: string | null;
}

export interface GraphSnapshot {
  nodes: {
    id: string;
    type: string;
    label: string | null;
    slug: string | null;
    config: Record<string, unknown>;
    positionX: number;
    positionY: number;
  }[];
  edges: {
    id: string;
    sourceNodeId: string;
    sourceHandle: string | null;
    targetNodeId: string;
    targetHandle: string | null;
    label: string | null;
  }[];
}

/**
 * Build a graph snapshot from pipeline nodes and edges, filtering out
 * trigger nodes and any edges connected to them.
 *
 * Returns null if no executable nodes remain.
 */
export function buildGraphSnapshot(
  nodes: NodeRow[],
  edges: EdgeRow[],
): GraphSnapshot | null {
  const executableNodes = nodes.filter((n) => n.type !== "trigger");
  if (executableNodes.length === 0) return null;

  const triggerNodeIds = new Set(
    nodes.filter((n) => n.type === "trigger").map((n) => n.id),
  );

  return {
    nodes: executableNodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      slug: n.slug,
      config: n.config ?? {},
      positionX: n.positionX,
      positionY: n.positionY,
    })),
    edges: edges
      .filter(
        (e) =>
          !triggerNodeIds.has(e.sourceNodeId) &&
          !triggerNodeIds.has(e.targetNodeId),
      )
      .map((e) => ({
        id: e.id,
        sourceNodeId: e.sourceNodeId,
        sourceHandle: e.sourceHandle,
        targetNodeId: e.targetNodeId,
        targetHandle: e.targetHandle,
        label: e.label,
      })),
  };
}
