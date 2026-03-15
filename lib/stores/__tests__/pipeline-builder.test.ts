import { describe, test, expect, beforeEach, mock } from "bun:test";

mock.module("@xyflow/react", () => ({
  applyNodeChanges: (changes: any[], nodes: any[]) => {
    // Minimal mock: handle "position" and "remove" change types
    let result = [...nodes];
    for (const change of changes) {
      if (change.type === "remove") {
        result = result.filter((n: any) => n.id !== change.id);
      }
      if (change.type === "position" && change.position) {
        result = result.map((n: any) =>
          n.id === change.id ? { ...n, position: change.position } : n,
        );
      }
    }
    return result;
  },
  applyEdgeChanges: (changes: any[], edges: any[]) => {
    let result = [...edges];
    for (const change of changes) {
      if (change.type === "remove") {
        result = result.filter((e: any) => e.id !== change.id);
      }
    }
    return result;
  },
}));

import {
  usePipelineBuilderStore,
  type PipelineNode,
  type PipelineEdge,
} from "@/lib/stores/pipeline-builder";
import { defaultConfigs } from "@/lib/pipeline/types";

function resetStore() {
  usePipelineBuilderStore.setState(
    usePipelineBuilderStore.getInitialState(),
    true,
  );
}

function makeNode(
  overrides: Partial<PipelineNode> & { id: string },
): PipelineNode {
  return {
    type: "api_request",
    position: { x: 0, y: 0 },
    data: { label: "Test", config: {} },
    ...overrides,
  };
}

function makeEdge(
  overrides: Partial<PipelineEdge> & { id: string; source: string; target: string },
): PipelineEdge {
  return { ...overrides };
}

function mockFetch(impl: (...args: any[]) => any) {
  const fn = mock(impl);
  globalThis.fetch = fn as any;
  return fn;
}

beforeEach(resetStore);

describe("initial state", () => {
  test("starts with empty nodes, edges, and null pipeline", () => {
    const s = usePipelineBuilderStore.getState();
    expect(s.pipelineId).toBeNull();
    expect(s.nodes).toEqual([]);
    expect(s.edges).toEqual([]);
    expect(s.selectedNodeId).toBeNull();
    expect(s.dirty).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.loading).toBe(false);
  });
});

describe("addNode", () => {
  test("adds a node with correct type, position, and default config", () => {
    usePipelineBuilderStore.getState().addNode("api_request", { x: 100, y: 200 });

    const { nodes, dirty } = usePipelineBuilderStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("api_request");
    expect(nodes[0].position).toEqual({ x: 100, y: 200 });
    expect(nodes[0].data.label).toBe("API Request");
    expect(nodes[0].data.config).toEqual({ ...defaultConfigs.api_request });
    expect(dirty).toBe(true);
  });

  test("assigns a unique id to each node", () => {
    const store = usePipelineBuilderStore.getState();
    store.addNode("sandbox", { x: 0, y: 0 });
    store.addNode("condition", { x: 50, y: 50 });

    const { nodes } = usePipelineBuilderStore.getState();
    expect(nodes).toHaveLength(2);
    expect(nodes[0].id).not.toBe(nodes[1].id);
  });

  test.each([
    ["api_request", "API Request"],
    ["ai_sdk", "AI SDK"],
    ["sandbox", "Sandbox"],
    ["condition", "Condition"],
    ["transform", "Transform"],
    ["metric_capture", "Metric Capture"],
  ] as const)("uses correct label for %s", (type, expectedLabel) => {
    usePipelineBuilderStore.getState().addNode(type, { x: 0, y: 0 });
    const { nodes } = usePipelineBuilderStore.getState();
    expect(nodes[0].data.label).toBe(expectedLabel);
  });
});

describe("selectNode", () => {
  test("sets selectedNodeId", () => {
    usePipelineBuilderStore.getState().selectNode("node-1");
    expect(usePipelineBuilderStore.getState().selectedNodeId).toBe("node-1");
  });

  test("clears selection with null", () => {
    usePipelineBuilderStore.getState().selectNode("node-1");
    usePipelineBuilderStore.getState().selectNode(null);
    expect(usePipelineBuilderStore.getState().selectedNodeId).toBeNull();
  });
});

describe("updateNodeConfig", () => {
  test("updates config on the target node only", () => {
    const n1 = makeNode({ id: "n1" });
    const n2 = makeNode({ id: "n2" });
    usePipelineBuilderStore.setState({ nodes: [n1, n2], dirty: false });

    const newConfig = { url: "https://example.com", method: "GET" };
    usePipelineBuilderStore.getState().updateNodeConfig("n1", newConfig);

    const { nodes, dirty } = usePipelineBuilderStore.getState();
    expect(nodes.find((n) => n.id === "n1")!.data.config).toEqual(newConfig);
    expect(nodes.find((n) => n.id === "n2")!.data.config).toEqual({});
    expect(dirty).toBe(true);
  });
});

describe("updateNodeLabel", () => {
  test("updates label on the target node only", () => {
    const n1 = makeNode({ id: "n1", data: { label: "Old", config: {} } });
    const n2 = makeNode({ id: "n2", data: { label: "Other", config: {} } });
    usePipelineBuilderStore.setState({ nodes: [n1, n2], dirty: false });

    usePipelineBuilderStore.getState().updateNodeLabel("n1", "Renamed");

    const { nodes, dirty } = usePipelineBuilderStore.getState();
    expect(nodes.find((n) => n.id === "n1")!.data.label).toBe("Renamed");
    expect(nodes.find((n) => n.id === "n2")!.data.label).toBe("Other");
    expect(dirty).toBe(true);
  });
});

describe("onConnect", () => {
  test("adds an edge from the connection", () => {
    usePipelineBuilderStore.getState().onConnect({
      source: "a",
      target: "b",
      sourceHandle: "out",
      targetHandle: "in",
    });

    const { edges, dirty } = usePipelineBuilderStore.getState();
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe("a");
    expect(edges[0].target).toBe("b");
    expect(edges[0].sourceHandle).toBe("out");
    expect(edges[0].targetHandle).toBe("in");
    expect(edges[0].id).toBeTruthy();
    expect(dirty).toBe(true);
  });

  test("defaults null handles when not provided", () => {
    usePipelineBuilderStore.getState().onConnect({
      source: "a",
      target: "b",
      sourceHandle: null,
      targetHandle: null,
    });

    const { edges } = usePipelineBuilderStore.getState();
    expect(edges[0].sourceHandle).toBeNull();
    expect(edges[0].targetHandle).toBeNull();
  });
});

describe("deleteSelected", () => {
  test("deletes a selected node and its connected edges", () => {
    const nodes = [makeNode({ id: "n1" }), makeNode({ id: "n2" }), makeNode({ id: "n3" })];
    const edges = [
      makeEdge({ id: "e1", source: "n1", target: "n2" }),
      makeEdge({ id: "e2", source: "n2", target: "n3" }),
      makeEdge({ id: "e3", source: "n1", target: "n3" }),
    ];
    usePipelineBuilderStore.setState({
      nodes,
      edges,
      selectedNodeId: "n1",
      dirty: false,
    });

    usePipelineBuilderStore.getState().deleteSelected();

    const s = usePipelineBuilderStore.getState();
    expect(s.nodes.map((n) => n.id)).toEqual(["n2", "n3"]);
    expect(s.edges.map((e) => e.id)).toEqual(["e2"]);
    expect(s.selectedNodeId).toBeNull();
    expect(s.dirty).toBe(true);
  });

  test("deletes a selected edge (prefers edge over node)", () => {
    const nodes = [makeNode({ id: "n1" }), makeNode({ id: "n2" })];
    const edges = [
      makeEdge({ id: "e1", source: "n1", target: "n2", selected: true }),
    ];
    usePipelineBuilderStore.setState({
      nodes,
      edges,
      selectedNodeId: "n1",
      dirty: false,
    });

    usePipelineBuilderStore.getState().deleteSelected();

    const s = usePipelineBuilderStore.getState();
    expect(s.nodes).toHaveLength(2);
    expect(s.edges).toHaveLength(0);
    expect(s.dirty).toBe(true);
  });

  test("does nothing when nothing is selected", () => {
    const nodes = [makeNode({ id: "n1" })];
    usePipelineBuilderStore.setState({ nodes, selectedNodeId: null, dirty: false });

    usePipelineBuilderStore.getState().deleteSelected();

    const s = usePipelineBuilderStore.getState();
    expect(s.nodes).toHaveLength(1);
    expect(s.dirty).toBe(false);
  });
});

describe("markClean", () => {
  test("sets dirty to false", () => {
    usePipelineBuilderStore.setState({ dirty: true });
    usePipelineBuilderStore.getState().markClean();
    expect(usePipelineBuilderStore.getState().dirty).toBe(false);
  });
});

describe("setNodes / setEdges", () => {
  test("setNodes replaces nodes", () => {
    const nodes = [makeNode({ id: "n1" })];
    usePipelineBuilderStore.getState().setNodes(nodes);
    expect(usePipelineBuilderStore.getState().nodes).toEqual(nodes);
  });

  test("setEdges replaces edges", () => {
    const edges = [makeEdge({ id: "e1", source: "a", target: "b" })];
    usePipelineBuilderStore.getState().setEdges(edges);
    expect(usePipelineBuilderStore.getState().edges).toEqual(edges);
  });
});

describe("load", () => {
  test("fetches pipeline and populates state", async () => {
    const mockNodes = [makeNode({ id: "n1" })];
    const mockEdges = [makeEdge({ id: "e1", source: "n1", target: "n2" })];

    const fetchMock = mockFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ nodes: mockNodes, edges: mockEdges }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await usePipelineBuilderStore.getState().load("pid-123");

    const s = usePipelineBuilderStore.getState();
    expect(s.pipelineId).toBe("pid-123");
    expect(s.nodes).toEqual(mockNodes);
    expect(s.edges).toEqual(mockEdges);
    expect(s.selectedNodeId).toBeNull();
    expect(s.dirty).toBe(false);
    expect(s.loading).toBe(false);

    expect(fetchMock).toHaveBeenCalledWith("/api/pipelines/pid-123");
  });

  test("throws on non-ok response and resets loading", async () => {
    mockFetch(() =>
      Promise.resolve(new Response("Not Found", { status: 404 })),
    );

    await expect(
      usePipelineBuilderStore.getState().load("bad-id"),
    ).rejects.toThrow("Failed to load pipeline");

    expect(usePipelineBuilderStore.getState().loading).toBe(false);
  });

  test("sets loading=true during fetch", async () => {
    let resolveResponse!: (res: Response) => void;
    mockFetch(
      () => new Promise<Response>((r) => { resolveResponse = r; }),
    );

    const loadPromise = usePipelineBuilderStore.getState().load("pid-123");
    expect(usePipelineBuilderStore.getState().loading).toBe(true);

    resolveResponse(
      new Response(JSON.stringify({ nodes: [], edges: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await loadPromise;

    expect(usePipelineBuilderStore.getState().loading).toBe(false);
  });
});

describe("save", () => {
  test("PUTs current nodes/edges and clears dirty", async () => {
    const nodes = [makeNode({ id: "n1" })];
    const edges = [makeEdge({ id: "e1", source: "n1", target: "n2" })];
    usePipelineBuilderStore.setState({
      pipelineId: "pid-123",
      nodes,
      edges,
      dirty: true,
    });

    const fetchMock = mockFetch(() =>
      Promise.resolve(new Response("{}", { status: 200 })),
    );

    await usePipelineBuilderStore.getState().save();

    const s = usePipelineBuilderStore.getState();
    expect(s.dirty).toBe(false);
    expect(s.saving).toBe(false);

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/pipelines/pid-123");
    expect(opts.method).toBe("PUT");
    expect(JSON.parse(opts.body as string)).toEqual({ nodes, edges });
  });

  test("throws on non-ok response and resets saving", async () => {
    usePipelineBuilderStore.setState({
      pipelineId: "pid-123",
      nodes: [],
      edges: [],
      dirty: true,
    });

    mockFetch(() =>
      Promise.resolve(new Response("Server Error", { status: 500 })),
    );

    await expect(
      usePipelineBuilderStore.getState().save(),
    ).rejects.toThrow("Failed to save pipeline");

    const s = usePipelineBuilderStore.getState();
    expect(s.saving).toBe(false);
    expect(s.dirty).toBe(true);
  });

  test("does nothing when pipelineId is null", async () => {
    const fetchMock = mockFetch(() => Promise.resolve(new Response()));
    usePipelineBuilderStore.setState({ pipelineId: null, dirty: true });

    await usePipelineBuilderStore.getState().save();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("sets saving=true during fetch", async () => {
    usePipelineBuilderStore.setState({ pipelineId: "pid-123", dirty: true });

    let resolveResponse!: (res: Response) => void;
    mockFetch(
      () => new Promise<Response>((r) => { resolveResponse = r; }),
    );

    const savePromise = usePipelineBuilderStore.getState().save();
    expect(usePipelineBuilderStore.getState().saving).toBe(true);

    resolveResponse(new Response("{}", { status: 200 }));
    await savePromise;

    expect(usePipelineBuilderStore.getState().saving).toBe(false);
  });
});
