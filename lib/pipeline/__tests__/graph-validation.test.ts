import { describe, expect, test } from "bun:test";
import {
  validateGraph,
  type GraphNode,
  type GraphEdge,
} from "../graph-validation";

function node(id: string, type = "transform"): GraphNode {
  return { id, type };
}

function conditionNode(id: string): GraphNode {
  return { id, type: "condition", config: { handles: ["true", "false"] } };
}

function edge(
  source: string,
  target: string,
  sourceHandle: string | null = null,
): GraphEdge {
  return {
    id: `${source}-${target}`,
    sourceNodeId: source,
    sourceHandle,
    targetNodeId: target,
    targetHandle: null,
  };
}


describe("validateGraph", () => {
  //  a → b → c
  test("accepts a valid linear DAG", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a", "b"), edge("b", "c")];
    const result = validateGraph(nodes, edges);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  //  a ──→ b
  //  ├───→ c
  //  └───→ d
  test("accepts a valid fan-out DAG", () => {
    const nodes = [node("a"), node("b"), node("c"), node("d")];
    const edges = [edge("a", "b"), edge("a", "c"), edge("a", "d")];
    const result = validateGraph(nodes, edges);
    expect(result.valid).toBe(true);
  });

  //  a ─┐
  //     ├→ c
  //  b ─┘
  test("accepts a valid fan-in DAG", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a", "c"), edge("b", "c")];
    const result = validateGraph(nodes, edges);
    expect(result.valid).toBe(true);
  });

  //  a → b → c
  //  ↑       │
  //  └───────┘
  test("rejects a graph with a cycle", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a", "b"), edge("b", "c"), edge("c", "a")];
    const result = validateGraph(nodes, edges);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "CYCLE_DETECTED")).toBe(true);
  });

  //  ╭───╮
  //  │ a │
  //  ╰─⟲─╯
  test("rejects a self-loop", () => {
    const nodes = [node("a")];
    const edges = [edge("a", "a")];
    const result = validateGraph(nodes, edges);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "CYCLE_DETECTED")).toBe(true);
  });

  //  n0 → n1 → n2 → ... → n50   (51 nodes)
  test("rejects when exceeding 50-node limit", () => {
    const nodes = Array.from({ length: 51 }, (_, i) => node(`n${i}`));
    const edges = nodes
      .slice(0, -1)
      .map((n, i) => edge(n.id, nodes[i + 1].id));
    const result = validateGraph(nodes, edges);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "MAX_NODES_EXCEEDED")).toBe(
      true,
    );
  });

  //  n0 → n1 → n2 → ... → n49   (50 nodes)
  test("accepts exactly 50 nodes", () => {
    const nodes = Array.from({ length: 50 }, (_, i) => node(`n${i}`));
    const edges = nodes
      .slice(0, -1)
      .map((n, i) => edge(n.id, nodes[i + 1].id));
    const result = validateGraph(nodes, edges);
    expect(result.valid).toBe(true);
  });

  //  ◇ cond ──true──→ a
  //         └─false─→ b
  test("condition node with 2+ distinct handles is valid", () => {
    const nodes = [conditionNode("cond"), node("a"), node("b")];
    const edges = [edge("cond", "a", "true"), edge("cond", "b", "false")];
    const result = validateGraph(nodes, edges);
    expect(result.valid).toBe(true);
  });

  //  ◇ cond ──true──→ a        (missing second handle)
  test("condition node with fewer than 2 handles is invalid", () => {
    const nodes = [conditionNode("cond"), node("a")];
    const edges = [edge("cond", "a", "true")];
    const result = validateGraph(nodes, edges);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "CONDITION_INSUFFICIENT_HANDLES"),
    ).toBe(true);
  });

  //  a → ◇ cond       (dead-end condition, no outgoing edges)
  test("condition node with no outgoing edges is invalid", () => {
    const nodes = [node("a"), conditionNode("cond")];
    const edges = [edge("a", "cond")];
    const result = validateGraph(nodes, edges);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "CONDITION_INSUFFICIENT_HANDLES"),
    ).toBe(true);
  });

  //  (empty)
  test("accepts an empty graph", () => {
    const result = validateGraph([], []);
    expect(result.valid).toBe(true);
  });

  //  a
  test("accepts a single node with no edges", () => {
    const result = validateGraph([node("a")], []);
    expect(result.valid).toBe(true);
  });
});
