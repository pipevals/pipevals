import { describe, test, expect, beforeEach, mock } from "bun:test";

import {
  useRunViewerStore,
  buildStepStatusMap,
  computeEdgeState,
  snapshotToFlow,
  EDGE_STYLES,
  type StepResult,
  type StepResultStatus,
  type RunData,
  type EdgeState,
} from "@/lib/stores/run-viewer";

function resetStore() {
  useRunViewerStore.setState(useRunViewerStore.getInitialState(), true);
}

function makeStepResult(
  overrides: Partial<StepResult> & { nodeId: string },
): StepResult {
  return {
    id: `sr-${overrides.nodeId}`,
    runId: "run-1",
    status: "completed",
    input: null,
    output: null,
    error: null,
    durationMs: null,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

function makeSnapshot(opts?: {
  nodes?: { id: string; type?: string }[];
  edges?: {
    id?: string;
    sourceNodeId: string;
    sourceHandle?: string | null;
    targetNodeId: string;
  }[];
}) {
  return {
    nodes: (opts?.nodes ?? []).map((n) => ({
      id: n.id,
      type: n.type ?? "transform",
      label: `Node ${n.id}`,
      config: {},
      positionX: 100,
      positionY: 200,
    })),
    edges: (opts?.edges ?? []).map((e, i) => ({
      id: e.id ?? `e${i}`,
      sourceNodeId: e.sourceNodeId,
      sourceHandle: e.sourceHandle ?? null,
      targetNodeId: e.targetNodeId,
      targetHandle: null,
      label: null,
    })),
  };
}

function mockFetch(impl: (...args: any[]) => any) {
  const fn = mock(impl);
  globalThis.fetch = fn as any;
  return fn;
}

beforeEach(resetStore);

// -------------------------------------------------------------------
// buildStepStatusMap
// -------------------------------------------------------------------

describe("buildStepStatusMap", () => {
  test("builds a map from nodeId to status", () => {
    const results = [
      makeStepResult({ nodeId: "a", status: "completed" }),
      makeStepResult({ nodeId: "b", status: "running" }),
      makeStepResult({ nodeId: "c", status: "failed" }),
    ];
    const map = buildStepStatusMap(results);
    expect(map).toEqual({
      a: "completed",
      b: "running",
      c: "failed",
    });
  });

  test("returns empty map for empty results", () => {
    expect(buildStepStatusMap([])).toEqual({});
  });

  test("last result wins for duplicate nodeIds", () => {
    const results = [
      makeStepResult({ nodeId: "a", status: "pending" }),
      makeStepResult({ nodeId: "a", status: "completed" }),
    ];
    expect(buildStepStatusMap(results).a).toBe("completed");
  });
});

// -------------------------------------------------------------------
// computeEdgeState
// -------------------------------------------------------------------

describe("computeEdgeState", () => {
  const edge = (
    source: string,
    target: string,
    sourceHandle: string | null = null,
  ) => ({
    id: `${source}-${target}`,
    sourceNodeId: source,
    sourceHandle,
    targetNodeId: target,
    targetHandle: null,
    label: null,
  });

  test("traversed when both source and target are completed", () => {
    const statusMap = { a: "completed" as const, b: "completed" as const };
    const result = computeEdgeState(
      edge("a", "b"),
      statusMap,
      {},
      { a: "transform", b: "transform" },
    );
    expect(result).toBe("traversed");
  });

  test("traversed when source completed and target failed", () => {
    const statusMap = { a: "completed" as const, b: "failed" as const };
    const result = computeEdgeState(
      edge("a", "b"),
      statusMap,
      {},
      { a: "transform", b: "transform" },
    );
    expect(result).toBe("traversed");
  });

  test("active when source finished and target running", () => {
    const statusMap = { a: "completed" as const, b: "running" as const };
    const result = computeEdgeState(
      edge("a", "b"),
      statusMap,
      {},
      { a: "transform", b: "transform" },
    );
    expect(result).toBe("active");
  });

  test("active when source finished and target pending", () => {
    const statusMap = { a: "completed" as const, b: "pending" as const };
    const result = computeEdgeState(
      edge("a", "b"),
      statusMap,
      {},
      { a: "transform", b: "transform" },
    );
    expect(result).toBe("active");
  });

  test("inactive when target is skipped", () => {
    const statusMap = { a: "completed" as const, b: "skipped" as const };
    const result = computeEdgeState(
      edge("a", "b"),
      statusMap,
      {},
      { a: "transform", b: "transform" },
    );
    expect(result).toBe("inactive");
  });

  test("pending when both nodes are pending", () => {
    const statusMap = { a: "pending" as const, b: "pending" as const };
    const result = computeEdgeState(
      edge("a", "b"),
      statusMap,
      {},
      { a: "transform", b: "transform" },
    );
    expect(result).toBe("pending");
  });

  test("inactive for condition node edge on non-active branch", () => {
    const statusMap = { cond: "completed" as const, a: "completed" as const, b: "skipped" as const };
    const resultMap = {
      cond: makeStepResult({
        nodeId: "cond",
        output: { branch: "true" },
      }),
    };
    const result = computeEdgeState(
      edge("cond", "b", "false"),
      statusMap,
      resultMap,
      { cond: "condition", a: "transform", b: "transform" },
    );
    expect(result).toBe("inactive");
  });

  test("traversed for condition node edge on active branch", () => {
    const statusMap = { cond: "completed" as const, a: "completed" as const };
    const resultMap = {
      cond: makeStepResult({
        nodeId: "cond",
        output: { branch: "true" },
      }),
    };
    const result = computeEdgeState(
      edge("cond", "a", "true"),
      statusMap,
      resultMap,
      { cond: "condition", a: "transform" },
    );
    expect(result).toBe("traversed");
  });

  test("pending for condition node that has not executed yet", () => {
    const statusMap = { cond: "pending" as const, a: "pending" as const };
    const result = computeEdgeState(
      edge("cond", "a", "true"),
      statusMap,
      {},
      { cond: "condition", a: "transform" },
    );
    expect(result).toBe("pending");
  });
});

// -------------------------------------------------------------------
// snapshotToFlow
// -------------------------------------------------------------------

describe("snapshotToFlow", () => {
  test("maps snapshot nodes to xyflow format", () => {
    const snapshot = makeSnapshot({
      nodes: [{ id: "n1" }],
    });
    const { nodes } = snapshotToFlow(snapshot);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("n1");
    expect(nodes[0].type).toBe("transform");
    expect(nodes[0].position).toEqual({ x: 100, y: 200 });
    expect(nodes[0].data.label).toBe("Node n1");
    expect(nodes[0].draggable).toBe(false);
    expect(nodes[0].connectable).toBe(false);
    expect(nodes[0].selectable).toBe(true);
  });

  test("maps snapshot edges to xyflow format", () => {
    const snapshot = makeSnapshot({
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ sourceNodeId: "a", targetNodeId: "b", id: "e1" }],
    });
    const { edges } = snapshotToFlow(snapshot);

    expect(edges).toHaveLength(1);
    expect(edges[0].id).toBe("e1");
    expect(edges[0].source).toBe("a");
    expect(edges[0].target).toBe("b");
  });

  test("converts null sourceHandle/label to undefined on edges", () => {
    const snapshot = makeSnapshot({
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ sourceNodeId: "a", targetNodeId: "b" }],
    });
    const { edges } = snapshotToFlow(snapshot);
    expect(edges[0].sourceHandle).toBeUndefined();
    expect(edges[0].label).toBeUndefined();
  });

  test("defaults nodes to pending status when no step results", () => {
    const snapshot = makeSnapshot({ nodes: [{ id: "n1" }, { id: "n2" }] });
    const { nodes } = snapshotToFlow(snapshot);

    expect(nodes[0].data.stepStatus).toBe("pending");
    expect(nodes[1].data.stepStatus).toBe("pending");
  });

  test("embeds step result status in node data", () => {
    const snapshot = makeSnapshot({
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    });
    const results = [
      makeStepResult({ nodeId: "a", status: "completed" }),
      makeStepResult({ nodeId: "b", status: "running" }),
    ];
    const { nodes } = snapshotToFlow(snapshot, results);

    expect(nodes.find((n) => n.id === "a")!.data.stepStatus).toBe("completed");
    expect(nodes.find((n) => n.id === "b")!.data.stepStatus).toBe("running");
    expect(nodes.find((n) => n.id === "c")!.data.stepStatus).toBe("pending");
  });

  test("applies edge styles based on step results", () => {
    const snapshot = makeSnapshot({
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ sourceNodeId: "a", targetNodeId: "b" }],
    });
    const results = [
      makeStepResult({ nodeId: "a", status: "completed" }),
      makeStepResult({ nodeId: "b", status: "completed" }),
    ];
    const { edges } = snapshotToFlow(snapshot, results);

    expect(edges[0].style).toEqual(EDGE_STYLES.traversed.style);
    expect(edges[0].animated).toBe(false);
  });

  test("animates active edges", () => {
    const snapshot = makeSnapshot({
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ sourceNodeId: "a", targetNodeId: "b" }],
    });
    const results = [
      makeStepResult({ nodeId: "a", status: "completed" }),
      makeStepResult({ nodeId: "b", status: "running" }),
    ];
    const { edges } = snapshotToFlow(snapshot, results);

    expect(edges[0].animated).toBe(true);
    expect(edges[0].style).toEqual(EDGE_STYLES.active.style);
  });

  test("dims inactive conditional branch edges", () => {
    const snapshot = makeSnapshot({
      nodes: [
        { id: "cond", type: "condition" },
        { id: "a" },
        { id: "b" },
      ],
      edges: [
        { sourceNodeId: "cond", targetNodeId: "a", sourceHandle: "true" },
        { sourceNodeId: "cond", targetNodeId: "b", sourceHandle: "false" },
      ],
    });
    const results = [
      makeStepResult({ nodeId: "cond", status: "completed", output: { branch: "true" } }),
      makeStepResult({ nodeId: "a", status: "completed" }),
      makeStepResult({ nodeId: "b", status: "skipped" }),
    ];
    const { edges } = snapshotToFlow(snapshot, results);

    const trueEdge = edges.find((e) => e.sourceHandle === "true")!;
    const falseEdge = edges.find((e) => e.sourceHandle === "false")!;
    expect(trueEdge.style).toEqual(EDGE_STYLES.traversed.style);
    expect(falseEdge.style).toEqual(EDGE_STYLES.inactive.style);
  });
});

// -------------------------------------------------------------------
// Store actions
// -------------------------------------------------------------------

describe("useRunViewerStore", () => {
  test("initial state", () => {
    const s = useRunViewerStore.getState();
    expect(s.run).toBeNull();
    expect(s.nodes).toEqual([]);
    expect(s.edges).toEqual([]);
    expect(s.selectedNodeId).toBeNull();
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
  });

  test("selectNode sets and clears selectedNodeId", () => {
    useRunViewerStore.getState().selectNode("n1");
    expect(useRunViewerStore.getState().selectedNodeId).toBe("n1");

    useRunViewerStore.getState().selectNode(null);
    expect(useRunViewerStore.getState().selectedNodeId).toBeNull();
  });

  describe("setRun", () => {
    test("populates nodes and edges from run data", () => {
      const run: RunData = {
        id: "run-1",
        pipelineId: "p-1",
        status: "completed",
        triggerPayload: null,
        graphSnapshot: makeSnapshot({
          nodes: [{ id: "a" }, { id: "b" }],
          edges: [{ sourceNodeId: "a", targetNodeId: "b" }],
        }),
        startedAt: null,
        completedAt: null,
        createdAt: "2026-01-01",
        stepResults: [
          makeStepResult({ nodeId: "a", status: "completed" }),
          makeStepResult({ nodeId: "b", status: "completed" }),
        ],
      };
      useRunViewerStore.getState().setRun(run);

      const s = useRunViewerStore.getState();
      expect(s.run).toBe(run);
      expect(s.nodes).toHaveLength(2);
      expect(s.edges).toHaveLength(1);
    });
  });

  describe("load", () => {
    test("fetches run and populates state", async () => {
      const run: RunData = {
        id: "run-1",
        pipelineId: "p-1",
        status: "completed",
        triggerPayload: null,
        graphSnapshot: makeSnapshot({
          nodes: [{ id: "a" }],
          edges: [],
        }),
        startedAt: null,
        completedAt: null,
        createdAt: "2026-01-01",
        stepResults: [
          makeStepResult({ nodeId: "a", status: "completed" }),
        ],
      };

      const fetchMock = mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify(run), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      await useRunViewerStore.getState().load("p-1", "run-1");

      const s = useRunViewerStore.getState();
      expect(s.run).toBeTruthy();
      expect(s.nodes).toHaveLength(1);
      expect(s.loading).toBe(false);
      expect(s.error).toBeNull();
      expect(s.selectedNodeId).toBeNull();

      expect(fetchMock).toHaveBeenCalledWith("/api/pipelines/p-1/runs/run-1");
    });

    test("sets error on non-ok response", async () => {
      mockFetch(() =>
        Promise.resolve(new Response("Not Found", { status: 404 })),
      );

      await useRunViewerStore.getState().load("p-1", "bad-run");

      const s = useRunViewerStore.getState();
      expect(s.error).toBe("Failed to load run");
      expect(s.loading).toBe(false);
      expect(s.run).toBeNull();
    });

    test("sets loading=true during fetch", async () => {
      let resolveResponse!: (res: Response) => void;
      mockFetch(
        () => new Promise<Response>((r) => { resolveResponse = r; }),
      );

      const loadPromise = useRunViewerStore.getState().load("p-1", "run-1");
      expect(useRunViewerStore.getState().loading).toBe(true);

      const run: RunData = {
        id: "run-1",
        pipelineId: "p-1",
        status: "completed",
        triggerPayload: null,
        graphSnapshot: makeSnapshot({ nodes: [], edges: [] }),
        startedAt: null,
        completedAt: null,
        createdAt: "2026-01-01",
        stepResults: [],
      };
      resolveResponse(
        new Response(JSON.stringify(run), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      await loadPromise;

      expect(useRunViewerStore.getState().loading).toBe(false);
    });

    test("clears previous error on new load", async () => {
      useRunViewerStore.setState({ error: "old error" });

      const run: RunData = {
        id: "run-1",
        pipelineId: "p-1",
        status: "completed",
        triggerPayload: null,
        graphSnapshot: makeSnapshot({ nodes: [], edges: [] }),
        startedAt: null,
        completedAt: null,
        createdAt: "2026-01-01",
        stepResults: [],
      };
      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify(run), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      await useRunViewerStore.getState().load("p-1", "run-1");
      expect(useRunViewerStore.getState().error).toBeNull();
    });
  });
});
