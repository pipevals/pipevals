import { describe, expect, test } from "bun:test";
import { BranchResolver } from "../core/branch-resolver";
import { loadGraph } from "../core/graph-loader";

function makeGraph(
  nodes: { id: string; type?: string }[],
  edges: {
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string | null;
  }[],
) {
  return loadGraph({
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type ?? "transform",
      config: {},
    })),
    edges: edges.map((e, i) => ({
      id: `e${i}`,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: null,
    })),
  });
}

describe("BranchResolver", () => {
  //  ◇ cond ──true──→ a
  //         └─false─→ b
  test("true branch taken, false branch skipped", () => {
    const graph = makeGraph(
      [
        { id: "cond", type: "condition" },
        { id: "a" },
        { id: "b" },
      ],
      [
        { sourceNodeId: "cond", targetNodeId: "a", sourceHandle: "true" },
        { sourceNodeId: "cond", targetNodeId: "b", sourceHandle: "false" },
      ],
    );

    const br = new BranchResolver();
    const completed = new Set(["cond"]);
    br.recordConditionResult("cond", "true");

    expect(br.isNodeReady("a", graph, completed)).toBe(true);
    expect(br.isNodeReady("b", graph, completed)).toBe(false);
  });

  //  a → b
  test("node after non-condition source is always reachable", () => {
    const graph = makeGraph(
      [{ id: "a" }, { id: "b" }],
      [{ sourceNodeId: "a", targetNodeId: "b" }],
    );

    const br = new BranchResolver();
    expect(br.isNodeReady("b", graph, new Set(["a"]))).toBe(true);
  });

  //  ◇ cond ──true──→ x ─┐
  //         └─false─→ y ─┼→ merge
  test("convergence after condition: merge node executes on active path only", () => {
    const graph = makeGraph(
      [
        { id: "cond", type: "condition" },
        { id: "x" },
        { id: "y" },
        { id: "merge" },
      ],
      [
        { sourceNodeId: "cond", targetNodeId: "x", sourceHandle: "true" },
        { sourceNodeId: "cond", targetNodeId: "y", sourceHandle: "false" },
        { sourceNodeId: "x", targetNodeId: "merge" },
        { sourceNodeId: "y", targetNodeId: "merge" },
      ],
    );

    const br = new BranchResolver();
    br.recordConditionResult("cond", "true");

    const completed = new Set(["cond", "x"]);

    expect(br.isNodeReady("merge", graph, completed)).toBe(true);
  });

  //  ◇ cond ──true──→ a       (cond not yet evaluated)
  test("before condition evaluates, downstream nodes wait", () => {
    const graph = makeGraph(
      [
        { id: "cond", type: "condition" },
        { id: "a" },
      ],
      [{ sourceNodeId: "cond", targetNodeId: "a", sourceHandle: "true" }],
    );

    const br = new BranchResolver();
    expect(br.isNodeReady("a", graph, new Set())).toBe(false);
  });

  //  a
  test("entry node is always ready", () => {
    const graph = makeGraph([{ id: "a" }], []);
    const br = new BranchResolver();
    expect(br.isNodeReady("a", graph, new Set())).toBe(true);
  });
});
