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

export function validateGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
): ValidationResult {
  const errors: ValidationError[] = [];

  if (nodes.length > MAX_NODES) {
    errors.push({
      code: "MAX_NODES_EXCEEDED",
      message: `Pipeline exceeds the ${MAX_NODES}-node limit (has ${nodes.length})`,
    });
  }

  const g = buildGraph(nodes, edges);

  for (const edge of edges) {
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

  for (const node of nodes) {
    if (node.type === "condition") {
      const outEdges = edges.filter((e) => e.sourceNodeId === node.id);
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
