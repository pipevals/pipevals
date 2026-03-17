import { Graph, alg } from "@dagrejs/graphlib";

const MAX_NODES = 50;

export interface GraphNode {
  id: string;
  type: string;
  config?: { handles?: string[] } & Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  sourceHandle: string | null;
  targetNodeId: string;
  targetHandle: string | null;
}

export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function buildGraph(nodes: GraphNode[], edges: GraphEdge[]): Graph {
  const g = new Graph({ directed: true });
  for (const node of nodes) {
    g.setNode(node.id);
  }
  for (const edge of edges) {
    if (g.hasNode(edge.sourceNodeId) && g.hasNode(edge.targetNodeId)) {
      g.setEdge(edge.sourceNodeId, edge.targetNodeId);
    }
  }
  return g;
}

/**
 * Returns true if adding an edge from `source` to `target` would introduce a cycle.
 */
export function wouldCreateCycle(
  edges: { source: string; target: string }[],
  source: string,
  target: string,
): boolean {
  if (source === target) return true;
  const g = new Graph({ directed: true });
  for (const e of edges) {
    g.setNode(e.source);
    g.setNode(e.target);
    g.setEdge(e.source, e.target);
  }
  g.setNode(source);
  g.setNode(target);
  g.setEdge(source, target);
  return !alg.isAcyclic(g);
}

export function validateGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
): ValidationResult {
  const errors: ValidationError[] = [];

  // Trigger nodes are UI-only and excluded from execution — skip them entirely.
  const triggerNodeIds = new Set(
    nodes.filter((n) => n.type === "trigger").map((n) => n.id),
  );
  const executableNodes = nodes.filter((n) => n.type !== "trigger");
  const executableEdges = edges.filter(
    (e) =>
      !triggerNodeIds.has(e.sourceNodeId) &&
      !triggerNodeIds.has(e.targetNodeId),
  );

  if (executableNodes.length > MAX_NODES) {
    errors.push({
      code: "MAX_NODES_EXCEEDED",
      message: `Pipeline exceeds the ${MAX_NODES}-node limit (has ${executableNodes.length})`,
    });
  }

  const g = buildGraph(executableNodes, executableEdges);

  for (const edge of executableEdges) {
    if (!g.hasNode(edge.sourceNodeId)) {
      errors.push({
        code: "INVALID_EDGE_SOURCE",
        message: `Edge "${edge.id}" references nonexistent source node "${edge.sourceNodeId}"`,
      });
    }
    if (!g.hasNode(edge.targetNodeId)) {
      errors.push({
        code: "INVALID_EDGE_TARGET",
        message: `Edge "${edge.id}" references nonexistent target node "${edge.targetNodeId}"`,
      });
    }
  }

  if (!alg.isAcyclic(g)) {
    const cycles = alg.findCycles(g);
    const involvedNodes = [...new Set(cycles.flat())];
    errors.push({
      code: "CYCLE_DETECTED",
      message: `Graph contains a cycle involving nodes: ${involvedNodes.join(", ")}`,
    });
  }

  const sourceNodeIds = new Set(g.sources());

  for (const node of executableNodes) {
    if (node.type === "condition") {
      const outEdges = executableEdges.filter((e) => e.sourceNodeId === node.id);
      const handles = new Set(
        outEdges.map((e) => e.sourceHandle).filter(Boolean),
      );
      if (handles.size < 2) {
        errors.push({
          code: "CONDITION_INSUFFICIENT_HANDLES",
          message: `Condition node "${node.id}" needs at least 2 distinct output handles, has ${handles.size}`,
          nodeId: node.id,
        });
      }
    } else if (
      !sourceNodeIds.has(node.id) &&
      (g.inEdges(node.id) || []).length === 0
    ) {
      errors.push({
        code: "MISSING_INCOMING_EDGE",
        message: `Node "${node.id}" (${node.type}) has no incoming edges`,
        nodeId: node.id,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
