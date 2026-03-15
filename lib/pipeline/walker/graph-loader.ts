import type { StepType } from "../types";

export interface WalkerNode {
  id: string;
  type: StepType;
  label: string | null;
  config: Record<string, unknown>;
}

export interface WalkerEdge {
  id: string;
  sourceNodeId: string;
  sourceHandle: string | null;
  targetNodeId: string;
  targetHandle: string | null;
}

export interface PipelineGraph {
  nodes: WalkerNode[];
  edges: WalkerEdge[];
  /** node id → list of outgoing edges */
  outgoing: Map<string, WalkerEdge[]>;
  /** node id → list of incoming edges */
  incoming: Map<string, WalkerEdge[]>;
  /** node id → WalkerNode */
  nodeMap: Map<string, WalkerNode>;
}

export function loadGraph(snapshot: {
  nodes: unknown[];
  edges: unknown[];
}): PipelineGraph {
  const nodes = snapshot.nodes.map((raw) => {
    const n = raw as Record<string, unknown>;
    return {
      id: n.id as string,
      type: n.type as StepType,
      label: (n.label as string) ?? null,
      config: (n.config as Record<string, unknown>) ?? {},
    };
  });

  const edges = snapshot.edges.map((raw) => {
    const e = raw as Record<string, unknown>;
    return {
      id: e.id as string,
      sourceNodeId: e.sourceNodeId as string,
      sourceHandle: (e.sourceHandle as string) ?? null,
      targetNodeId: e.targetNodeId as string,
      targetHandle: (e.targetHandle as string) ?? null,
    };
  });

  const nodeMap = new Map<string, WalkerNode>();
  const outgoing = new Map<string, WalkerEdge[]>();
  const incoming = new Map<string, WalkerEdge[]>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const edge of edges) {
    const src = outgoing.get(edge.sourceNodeId);
    const tgt = incoming.get(edge.targetNodeId);

    if (!src || !tgt) {
      throw new Error(
        `Edge "${edge.id}" references missing node(s):` +
          `${!src ? ` source "${edge.sourceNodeId}"` : ""}` +
          `${!tgt ? ` target "${edge.targetNodeId}"` : ""}`,
      );
    }

    src.push(edge);
    tgt.push(edge);
  }

  return { nodes, edges, outgoing, incoming, nodeMap };
}
