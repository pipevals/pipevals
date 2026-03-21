import { describe, expect, test } from "bun:test";
import { topologicalSort } from "../core/topological-sort";
import { loadGraph } from "../core/graph-loader";

function makeSnapshot(
  nodes: { id: string; type?: string }[],
  edges: { id: string; sourceNodeId: string; targetNodeId: string }[],
) {
  return loadGraph({
    nodes: nodes.map((n) => ({ ...n, type: n.type ?? "transform", config: {} })),
    edges: edges.map((e) => ({
      ...e,
      sourceHandle: null,
      targetHandle: null,
    })),
  });
}

function levelIds(levels: { id: string }[][]): string[][] {
  return levels.map((level) => level.map((n) => n.id).sort());
}

describe("topologicalSort", () => {
  //  a → b → c
  test("linear chain: A → B → C produces 3 levels", () => {
    const graph = makeSnapshot(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [
        { id: "e1", sourceNodeId: "a", targetNodeId: "b" },
        { id: "e2", sourceNodeId: "b", targetNodeId: "c" },
      ],
    );

    const levels = topologicalSort(graph);
    expect(levelIds(levels)).toEqual([["a"], ["b"], ["c"]]);
  });

  //  a ──→ b
  //  ├───→ c
  //  └───→ d
  test("fan-out: A → B, A → C, A → D puts B,C,D in same level", () => {
    const graph = makeSnapshot(
      [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      [
        { id: "e1", sourceNodeId: "a", targetNodeId: "b" },
        { id: "e2", sourceNodeId: "a", targetNodeId: "c" },
        { id: "e3", sourceNodeId: "a", targetNodeId: "d" },
      ],
    );

    const levels = topologicalSort(graph);
    expect(levelIds(levels)).toEqual([["a"], ["b", "c", "d"]]);
  });

  //  a ─┐
  //     ├→ c
  //  b ─┘
  test("fan-in: A → C, B → C waits for both", () => {
    const graph = makeSnapshot(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [
        { id: "e1", sourceNodeId: "a", targetNodeId: "c" },
        { id: "e2", sourceNodeId: "b", targetNodeId: "c" },
      ],
    );

    const levels = topologicalSort(graph);
    expect(levelIds(levels)).toEqual([["a", "b"], ["c"]]);
  });

  //  a ──→ b ─┐
  //  └──→ c ─┼→ d
  test("diamond: A → B, A → C, B → D, C → D", () => {
    const graph = makeSnapshot(
      [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      [
        { id: "e1", sourceNodeId: "a", targetNodeId: "b" },
        { id: "e2", sourceNodeId: "a", targetNodeId: "c" },
        { id: "e3", sourceNodeId: "b", targetNodeId: "d" },
        { id: "e4", sourceNodeId: "c", targetNodeId: "d" },
      ],
    );

    const levels = topologicalSort(graph);
    expect(levelIds(levels)).toEqual([["a"], ["b", "c"], ["d"]]);
  });

  //  a
  test("single node returns one level", () => {
    const graph = makeSnapshot([{ id: "a" }], []);
    const levels = topologicalSort(graph);
    expect(levelIds(levels)).toEqual([["a"]]);
  });

  //  (empty)
  test("empty graph returns no levels", () => {
    const graph = makeSnapshot([], []);
    const levels = topologicalSort(graph);
    expect(levels).toEqual([]);
  });

  //  a ─┐
  //     ├→ c
  //  b ─┘
  test("multiple roots start in the same level", () => {
    const graph = makeSnapshot(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [
        { id: "e1", sourceNodeId: "a", targetNodeId: "c" },
        { id: "e2", sourceNodeId: "b", targetNodeId: "c" },
      ],
    );

    const levels = topologicalSort(graph);
    expect(levels[0].map((n) => n.id).sort()).toEqual(["a", "b"]);
  });
});
