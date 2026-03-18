import { describe, expect, test } from "bun:test";
import { resolveInputs } from "../../walker/input-resolver";
import { loadGraph } from "../../walker/graph-loader";
import type { WalkerNode } from "../../walker/graph-loader";

function makeGraph(
  nodes: { id: string; label?: string }[],
  edges: { sourceNodeId: string; targetNodeId: string }[],
) {
  return loadGraph({
    nodes: nodes.map((n) => ({ type: "transform", config: {}, ...n })),
    edges: edges.map((e, i) => ({
      id: `e${i}`,
      ...e,
      sourceHandle: null,
      targetHandle: null,
    })),
  });
}

describe("resolveInputs", () => {
  //  a ─┐
  //     ├→ c
  //  b ─┘
  test("gathers upstream outputs into steps.<nodeId>", () => {
    const graph = makeGraph(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [
        { sourceNodeId: "a", targetNodeId: "c" },
        { sourceNodeId: "b", targetNodeId: "c" },
      ],
    );

    const results = new Map<string, Record<string, unknown>>();
    results.set("a", { score: 0.9 });
    results.set("b", { text: "hello" });

    const input = resolveInputs(
      graph.nodeMap.get("c")!,
      graph,
      results,
      {},
    );

    expect(input.steps.a).toEqual({ score: 0.9 });
    expect(input.steps.b).toEqual({ text: "hello" });
  });

  //  a
  test("includes trigger payload", () => {
    const graph = makeGraph([{ id: "a" }], []);

    const input = resolveInputs(
      graph.nodeMap.get("a")!,
      graph,
      new Map(),
      { prompt: "test" },
    );

    expect(input.trigger).toEqual({ prompt: "test" });
  });

  //  a → b       (perspective of a)
  test("entry node with no upstream has empty steps", () => {
    const graph = makeGraph([{ id: "a" }, { id: "b" }], [
      { sourceNodeId: "a", targetNodeId: "b" },
    ]);

    const input = resolveInputs(
      graph.nodeMap.get("a")!,
      graph,
      new Map(),
      {},
    );

    expect(input.steps).toEqual({});
  });

  //  a("llm") → b
  test("also keys upstream output by label when present", () => {
    const graph = makeGraph(
      [{ id: "a", label: "llm" }, { id: "b" }],
      [{ sourceNodeId: "a", targetNodeId: "b" }],
    );

    const results = new Map<string, Record<string, unknown>>();
    results.set("a", { text: "hello" });

    const input = resolveInputs(
      graph.nodeMap.get("b")!,
      graph,
      results,
      {},
    );

    expect(input.steps.a).toEqual({ text: "hello" });
    expect(input.steps.llm).toEqual({ text: "hello" });
  });

  //  a (no label) → b
  test("does not add label key when label is absent", () => {
    const graph = makeGraph(
      [{ id: "a" }, { id: "b" }],
      [{ sourceNodeId: "a", targetNodeId: "b" }],
    );

    const results = new Map<string, Record<string, unknown>>();
    results.set("a", { val: 1 });

    const input = resolveInputs(
      graph.nodeMap.get("b")!,
      graph,
      results,
      {},
    );

    expect(input.steps.a).toEqual({ val: 1 });
    expect(Object.keys(input.steps)).toEqual(["a"]);
  });

  //  a ─┐
  //     ├→ c       (b has no result yet)
  //  b ─┘
  test("skips upstream nodes without results", () => {
    const graph = makeGraph(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [
        { sourceNodeId: "a", targetNodeId: "c" },
        { sourceNodeId: "b", targetNodeId: "c" },
      ],
    );

    const results = new Map<string, Record<string, unknown>>();
    results.set("a", { val: 1 });

    const input = resolveInputs(
      graph.nodeMap.get("c")!,
      graph,
      results,
      {},
    );

    expect(input.steps.a).toEqual({ val: 1 });
    expect(input.steps.b).toBeUndefined();
  });
});
