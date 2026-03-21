import { describe, test, expect, beforeEach, mock } from "bun:test";

mock.module("@xyflow/react", () => ({
  applyNodeChanges: (changes: any[], nodes: any[]) => {
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
  TRIGGER_NODE_ID,
  type PipelineNode,
  type PipelineEdge,
} from "@/lib/stores/pipeline-builder";

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
    data: { label: "Test", slug: "test", config: {} },
    ...overrides,
  };
}

function makeEdge(
  overrides: Partial<PipelineEdge> & { id: string; source: string; target: string },
): PipelineEdge {
  return { ...overrides };
}

beforeEach(resetStore);

// ===========================================================================
// UNDO / REDO
// ===========================================================================

describe("undo / redo", () => {
  // --- canUndo / canRedo ---

  test("canUndo and canRedo are false initially", () => {
    expect(usePipelineBuilderStore.getState().canUndo()).toBe(false);
    expect(usePipelineBuilderStore.getState().canRedo()).toBe(false);
  });

  test("canUndo is true after a mutation", () => {
    usePipelineBuilderStore.getState().addNode("api_request", { x: 0, y: 0 });
    expect(usePipelineBuilderStore.getState().canUndo()).toBe(true);
    expect(usePipelineBuilderStore.getState().canRedo()).toBe(false);
  });

  // --- undo does nothing at the beginning ---

  test("undo is a no-op when history is empty", () => {
    usePipelineBuilderStore.setState({ nodes: [makeNode({ id: "n1" })] });
    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(1);
  });

  // --- redo does nothing when future is empty ---

  test("redo is a no-op when future is empty", () => {
    usePipelineBuilderStore.getState().addNode("api_request", { x: 0, y: 0 });
    usePipelineBuilderStore.getState().redo();
    // Still 1 node — redo did nothing
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(1);
  });

  // --- undo addNode ---

  test("undo reverses addNode", () => {
    usePipelineBuilderStore.getState().addNode("api_request", { x: 10, y: 20 });
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(1);

    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(0);
  });

  // --- redo after undo ---

  test("redo re-applies after undo", () => {
    usePipelineBuilderStore.getState().addNode("api_request", { x: 10, y: 20 });
    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(0);

    usePipelineBuilderStore.getState().redo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(1);
    expect(usePipelineBuilderStore.getState().nodes[0].type).toBe("api_request");
  });

  // --- undo deleteSelected ---

  test("undo reverses deleteSelected (node)", () => {
    const n1 = makeNode({ id: "n1" });
    const n2 = makeNode({ id: "n2" });
    const edge = makeEdge({ id: "e1", source: "n1", target: "n2" });
    usePipelineBuilderStore.setState({
      nodes: [n1, n2],
      edges: [edge],
      selectedNodeId: "n1",
    });

    usePipelineBuilderStore.getState().deleteSelected();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(1);
    expect(usePipelineBuilderStore.getState().edges).toHaveLength(0);

    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(2);
    expect(usePipelineBuilderStore.getState().edges).toHaveLength(1);
  });

  test("undo reverses deleteSelected (edge)", () => {
    const edge = makeEdge({ id: "e1", source: "n1", target: "n2", selected: true });
    usePipelineBuilderStore.setState({
      nodes: [makeNode({ id: "n1" }), makeNode({ id: "n2" })],
      edges: [edge],
    });

    usePipelineBuilderStore.getState().deleteSelected();
    expect(usePipelineBuilderStore.getState().edges).toHaveLength(0);

    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().edges).toHaveLength(1);
  });

  // --- undo updateNodeConfig ---

  test("undo reverses updateNodeConfig", () => {
    const n1 = makeNode({ id: "n1", data: { label: "N1", slug: "n1", config: { url: "old" } } });
    usePipelineBuilderStore.setState({ nodes: [n1] });

    usePipelineBuilderStore.getState().updateNodeConfig("n1", { url: "new" });
    expect(usePipelineBuilderStore.getState().nodes[0].data.config).toEqual({ url: "new" });

    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes[0].data.config).toEqual({ url: "old" });
  });

  // --- undo updateNodeLabel ---

  test("undo reverses updateNodeLabel", () => {
    const n1 = makeNode({ id: "n1", data: { label: "Old", slug: "old", config: {} } });
    usePipelineBuilderStore.setState({ nodes: [n1] });

    usePipelineBuilderStore.getState().updateNodeLabel("n1", "New");
    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes[0].data.label).toBe("Old");
  });

  // --- undo updateNodeSlug ---

  test("undo reverses updateNodeSlug", () => {
    const n1 = makeNode({ id: "n1", data: { label: "Node", slug: "old-slug", config: {} } });
    usePipelineBuilderStore.setState({ nodes: [n1] });

    usePipelineBuilderStore.getState().updateNodeSlug("n1", "new-slug");
    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes[0].data.slug).toBe("old-slug");
  });

  // --- undo setTriggerSchema ---

  test("undo reverses setTriggerSchema", () => {
    usePipelineBuilderStore.getState().setTriggerSchema({ prompt: "" });
    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().triggerSchema).toEqual({});
  });

  // --- undo onConnect ---

  test("undo reverses onConnect", () => {
    usePipelineBuilderStore.setState({
      nodes: [makeNode({ id: "a" }), makeNode({ id: "b" })],
    });

    usePipelineBuilderStore.getState().onConnect({
      source: "a",
      target: "b",
      sourceHandle: null,
      targetHandle: null,
    });
    expect(usePipelineBuilderStore.getState().edges).toHaveLength(1);

    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().edges).toHaveLength(0);
  });

  // --- undo onNodesChange (position) ---

  test("undo reverses onNodesChange position", () => {
    const n1 = makeNode({ id: "n1", position: { x: 0, y: 0 } });
    usePipelineBuilderStore.setState({ nodes: [n1] });

    usePipelineBuilderStore.getState().onNodesChange([
      { type: "position", id: "n1", position: { x: 100, y: 200 } } as any,
    ]);
    expect(usePipelineBuilderStore.getState().nodes[0].position).toEqual({ x: 100, y: 200 });

    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes[0].position).toEqual({ x: 0, y: 0 });
  });

  // --- dimension changes don't push history ---

  test("onNodesChange with only dimension changes does not push history", () => {
    const n1 = makeNode({ id: "n1" });
    usePipelineBuilderStore.setState({ nodes: [n1] });

    usePipelineBuilderStore.getState().onNodesChange([
      { type: "dimensions", id: "n1" } as any,
    ]);
    expect(usePipelineBuilderStore.getState().canUndo()).toBe(false);
  });

  // --- dragging suppresses history ---

  test("position changes with dragging=true do not push history", () => {
    const n1 = makeNode({ id: "n1", position: { x: 0, y: 0 } });
    usePipelineBuilderStore.setState({ nodes: [n1] });

    // Simulate multiple drag events
    for (let i = 1; i <= 10; i++) {
      usePipelineBuilderStore.getState().onNodesChange([
        { type: "position", id: "n1", position: { x: i * 10, y: i * 10 }, dragging: true } as any,
      ]);
    }

    // No history entries during drag
    expect(usePipelineBuilderStore.getState().canUndo()).toBe(false);
    // But position did update
    expect(usePipelineBuilderStore.getState().nodes[0].position).toEqual({ x: 100, y: 100 });
  });

  test("position change with dragging=false pushes a single history entry", () => {
    const n1 = makeNode({ id: "n1", position: { x: 0, y: 0 } });
    usePipelineBuilderStore.setState({ nodes: [n1] });

    // Drag events
    for (let i = 1; i <= 5; i++) {
      usePipelineBuilderStore.getState().onNodesChange([
        { type: "position", id: "n1", position: { x: i * 10, y: i * 10 }, dragging: true } as any,
      ]);
    }
    // Final drop event
    usePipelineBuilderStore.getState().onNodesChange([
      { type: "position", id: "n1", position: { x: 50, y: 50 }, dragging: false } as any,
    ]);

    // Exactly one undo step for the whole drag
    expect(usePipelineBuilderStore.getState().canUndo()).toBe(true);
    usePipelineBuilderStore.getState().undo();
    // Position reverts to the pre-drag value (which was the last mid-drag value,
    // since only the drop event pushed history — the snapshot captured is from
    // just before the drop, i.e. {x:50,y:50} from the last dragging:true event)
    expect(usePipelineBuilderStore.getState().canUndo()).toBe(false);
  });

  // --- edge selection doesn't push history ---

  test("onEdgesChange with only select changes does not push history", () => {
    const edge = makeEdge({ id: "e1", source: "a", target: "b" });
    usePipelineBuilderStore.setState({ edges: [edge] });

    usePipelineBuilderStore.getState().onEdgesChange([
      { type: "select", id: "e1", selected: true } as any,
    ]);

    expect(usePipelineBuilderStore.getState().canUndo()).toBe(false);
    expect(usePipelineBuilderStore.getState().dirty).toBe(false);
  });

  // --- redo is cleared on new mutation ---

  test("new mutation clears redo stack", () => {
    usePipelineBuilderStore.getState().addNode("api_request", { x: 0, y: 0 });
    usePipelineBuilderStore.getState().addNode("sandbox", { x: 50, y: 50 });

    // Undo to build up future stack
    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().canRedo()).toBe(true);

    // New mutation wipes redo
    usePipelineBuilderStore.getState().addNode("condition", { x: 100, y: 100 });
    expect(usePipelineBuilderStore.getState().canRedo()).toBe(false);
  });

  // --- multi-step undo ---

  test("multiple undos walk back through history in order", () => {
    usePipelineBuilderStore.getState().addNode("api_request", { x: 0, y: 0 });
    usePipelineBuilderStore.getState().addNode("sandbox", { x: 10, y: 10 });
    usePipelineBuilderStore.getState().addNode("condition", { x: 20, y: 20 });

    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(3);

    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(2);

    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(1);

    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(0);

    // Can't undo further
    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(0);
  });

  // --- multi-step redo ---

  test("multiple redos walk forward through future in order", () => {
    usePipelineBuilderStore.getState().addNode("api_request", { x: 0, y: 0 });
    usePipelineBuilderStore.getState().addNode("sandbox", { x: 10, y: 10 });

    usePipelineBuilderStore.getState().undo();
    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(0);

    usePipelineBuilderStore.getState().redo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(1);

    usePipelineBuilderStore.getState().redo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(2);

    // Can't redo further
    usePipelineBuilderStore.getState().redo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(2);
  });

  // --- undo marks dirty ---

  test("undo sets dirty to true", () => {
    usePipelineBuilderStore.getState().addNode("api_request", { x: 0, y: 0 });
    usePipelineBuilderStore.setState({ dirty: false });

    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().dirty).toBe(true);
  });

  // --- redo marks dirty ---

  test("redo sets dirty to true", () => {
    usePipelineBuilderStore.getState().addNode("api_request", { x: 0, y: 0 });
    usePipelineBuilderStore.getState().undo();
    usePipelineBuilderStore.setState({ dirty: false });

    usePipelineBuilderStore.getState().redo();
    expect(usePipelineBuilderStore.getState().dirty).toBe(true);
  });

  // --- history cap ---

  test("history is capped at 50 entries", () => {
    for (let i = 0; i < 60; i++) {
      usePipelineBuilderStore.getState().addNode("api_request", { x: i, y: i });
    }
    // Undo until we can't — should be capped at 50 steps, not 60
    let undoCount = 0;
    while (usePipelineBuilderStore.getState().canUndo()) {
      usePipelineBuilderStore.getState().undo();
      undoCount++;
    }
    expect(undoCount).toBeLessThanOrEqual(50);
  });

  // --- load clears history ---

  test("load resets history and future", async () => {
    usePipelineBuilderStore.getState().addNode("api_request", { x: 0, y: 0 });
    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().canRedo()).toBe(true);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ nodes: [], edges: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ) as any;

    try {
      await usePipelineBuilderStore.getState().load("pid-1");
      expect(usePipelineBuilderStore.getState().canUndo()).toBe(false);
      expect(usePipelineBuilderStore.getState().canRedo()).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // --- undo onEdgesChange ---

  test("undo reverses onEdgesChange", () => {
    const edge = makeEdge({ id: "e1", source: "a", target: "b" });
    usePipelineBuilderStore.setState({ edges: [edge] });

    usePipelineBuilderStore.getState().onEdgesChange([
      { type: "remove", id: "e1" },
    ]);
    expect(usePipelineBuilderStore.getState().edges).toHaveLength(0);

    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().edges).toHaveLength(1);
  });

  // --- undo/redo preserves triggerSchema alongside nodes/edges ---

  test("undo/redo restores triggerSchema together with nodes/edges", () => {
    usePipelineBuilderStore.getState().setTriggerSchema({ prompt: "" });
    usePipelineBuilderStore.getState().addNode("api_request", { x: 0, y: 0 });

    // After addNode: schema is { prompt: "" }, 1 node
    usePipelineBuilderStore.getState().undo();
    // After undo addNode: schema still { prompt: "" }, 0 nodes
    expect(usePipelineBuilderStore.getState().triggerSchema).toEqual({ prompt: "" });
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(0);

    usePipelineBuilderStore.getState().undo();
    // After undo setTriggerSchema: schema back to {}
    expect(usePipelineBuilderStore.getState().triggerSchema).toEqual({});
  });
});

// ===========================================================================
// COPY / PASTE
// ===========================================================================

describe("copy / paste", () => {
  // --- clipboard is null initially ---

  test("clipboard is null initially", () => {
    expect(usePipelineBuilderStore.getState().clipboard).toBeNull();
  });

  // --- copy single node via selectedNodeId ---

  test("copySelected copies a node selected via selectedNodeId", () => {
    const n1 = makeNode({ id: "n1" });
    usePipelineBuilderStore.setState({ nodes: [n1], selectedNodeId: "n1" });

    usePipelineBuilderStore.getState().copySelected();

    const { clipboard } = usePipelineBuilderStore.getState();
    expect(clipboard).not.toBeNull();
    expect(clipboard!.nodes).toHaveLength(1);
    expect(clipboard!.nodes[0].id).toBe("n1");
    expect(clipboard!.edges).toHaveLength(0);
  });

  // --- copy single node via selected flag ---

  test("copySelected copies a node selected via .selected flag", () => {
    const n1 = makeNode({ id: "n1", selected: true });
    usePipelineBuilderStore.setState({ nodes: [n1] });

    usePipelineBuilderStore.getState().copySelected();

    const { clipboard } = usePipelineBuilderStore.getState();
    expect(clipboard!.nodes).toHaveLength(1);
  });

  // --- copy excludes trigger node ---

  test("copySelected excludes the trigger node", () => {
    const trigger = makeNode({
      id: TRIGGER_NODE_ID,
      type: "trigger" as any,
      selected: true,
    });
    usePipelineBuilderStore.setState({
      nodes: [trigger],
      selectedNodeId: TRIGGER_NODE_ID,
    });

    usePipelineBuilderStore.getState().copySelected();
    expect(usePipelineBuilderStore.getState().clipboard).toBeNull();
  });

  // --- copy does nothing when nothing is selected ---

  test("copySelected is a no-op when no nodes are selected", () => {
    usePipelineBuilderStore.setState({ nodes: [makeNode({ id: "n1" })] });
    usePipelineBuilderStore.getState().copySelected();
    expect(usePipelineBuilderStore.getState().clipboard).toBeNull();
  });

  // --- copy multiple nodes with edges ---

  test("copySelected copies multiple selected nodes and their connecting edges", () => {
    const n1 = makeNode({ id: "n1", selected: true });
    const n2 = makeNode({ id: "n2", selected: true });
    const n3 = makeNode({ id: "n3" }); // not selected
    const e1 = makeEdge({ id: "e1", source: "n1", target: "n2" });
    const e2 = makeEdge({ id: "e2", source: "n1", target: "n3" }); // n3 not selected
    usePipelineBuilderStore.setState({ nodes: [n1, n2, n3], edges: [e1, e2] });

    usePipelineBuilderStore.getState().copySelected();

    const { clipboard } = usePipelineBuilderStore.getState();
    expect(clipboard!.nodes).toHaveLength(2);
    expect(clipboard!.edges).toHaveLength(1);
    expect(clipboard!.edges[0].id).toBe("e1");
  });

  // --- paste single node ---

  test("pasteClipboard clones a single node with a new id and offset position", () => {
    const n1 = makeNode({ id: "n1", position: { x: 10, y: 20 } });
    usePipelineBuilderStore.setState({
      nodes: [n1],
      selectedNodeId: "n1",
    });

    usePipelineBuilderStore.getState().copySelected();
    usePipelineBuilderStore.getState().pasteClipboard();

    const { nodes } = usePipelineBuilderStore.getState();
    expect(nodes).toHaveLength(2);

    const pasted = nodes.find((n) => n.id !== "n1")!;
    expect(pasted.id).not.toBe("n1");
    expect(pasted.position).toEqual({ x: 60, y: 70 });
    expect(pasted.data.label).toBe("Test");
    expect(pasted.selected).toBe(true);
  });

  // --- paste sets selectedNodeId for single-node paste ---

  test("paste sets selectedNodeId when pasting a single node", () => {
    const n1 = makeNode({ id: "n1" });
    usePipelineBuilderStore.setState({ nodes: [n1], selectedNodeId: "n1" });
    usePipelineBuilderStore.getState().copySelected();
    usePipelineBuilderStore.getState().pasteClipboard();

    const { selectedNodeId, nodes } = usePipelineBuilderStore.getState();
    const pasted = nodes.find((n) => n.id !== "n1")!;
    expect(selectedNodeId).toBe(pasted.id);
  });

  // --- paste deselects existing nodes ---

  test("paste deselects previously selected nodes", () => {
    const n1 = makeNode({ id: "n1", selected: true });
    usePipelineBuilderStore.setState({ nodes: [n1], selectedNodeId: "n1" });
    usePipelineBuilderStore.getState().copySelected();
    usePipelineBuilderStore.getState().pasteClipboard();

    const original = usePipelineBuilderStore.getState().nodes.find((n) => n.id === "n1")!;
    expect(original.selected).toBe(false);
  });

  // --- paste multiple nodes with remapped edges ---

  test("paste clones multiple nodes and remaps edge ids", () => {
    const n1 = makeNode({ id: "n1", selected: true, position: { x: 0, y: 0 } });
    const n2 = makeNode({ id: "n2", selected: true, position: { x: 100, y: 0 } });
    const e1 = makeEdge({ id: "e1", source: "n1", target: "n2" });
    usePipelineBuilderStore.setState({ nodes: [n1, n2], edges: [e1] });

    usePipelineBuilderStore.getState().copySelected();
    usePipelineBuilderStore.getState().pasteClipboard();

    const { nodes, edges } = usePipelineBuilderStore.getState();
    expect(nodes).toHaveLength(4);
    expect(edges).toHaveLength(2);

    const newEdge = edges.find((e) => e.id !== "e1")!;
    expect(newEdge.id).not.toBe("e1");
    expect(newEdge.source).not.toBe("n1");
    expect(newEdge.target).not.toBe("n2");
    // The edge should connect the two pasted nodes
    const pastedIds = new Set(nodes.filter((n) => n.id !== "n1" && n.id !== "n2").map((n) => n.id));
    expect(pastedIds.has(newEdge.source)).toBe(true);
    expect(pastedIds.has(newEdge.target)).toBe(true);
  });

  // --- paste multiple times ---

  test("paste can be called multiple times from the same clipboard", () => {
    const n1 = makeNode({ id: "n1", position: { x: 0, y: 0 } });
    usePipelineBuilderStore.setState({ nodes: [n1], selectedNodeId: "n1" });

    usePipelineBuilderStore.getState().copySelected();
    usePipelineBuilderStore.getState().pasteClipboard();
    usePipelineBuilderStore.getState().pasteClipboard();

    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(3);
    const ids = usePipelineBuilderStore.getState().nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(3); // all unique
  });

  // --- successive pastes offset incrementally ---

  test("successive pastes place nodes at increasing offsets", () => {
    const n1 = makeNode({ id: "n1", position: { x: 0, y: 0 } });
    usePipelineBuilderStore.setState({ nodes: [n1], selectedNodeId: "n1" });

    usePipelineBuilderStore.getState().copySelected();
    usePipelineBuilderStore.getState().pasteClipboard();
    usePipelineBuilderStore.getState().pasteClipboard();
    usePipelineBuilderStore.getState().pasteClipboard();

    const positions = usePipelineBuilderStore.getState().nodes
      .filter((n) => n.id !== "n1")
      .map((n) => n.position);

    expect(positions[0]).toEqual({ x: 50, y: 50 });
    expect(positions[1]).toEqual({ x: 100, y: 100 });
    expect(positions[2]).toEqual({ x: 150, y: 150 });
  });

  // --- paste preserves config ---

  test("paste preserves node config", () => {
    const n1 = makeNode({
      id: "n1",
      data: { label: "API", slug: "api", config: { url: "https://example.com", method: "POST" } },
    });
    usePipelineBuilderStore.setState({ nodes: [n1], selectedNodeId: "n1" });

    usePipelineBuilderStore.getState().copySelected();
    usePipelineBuilderStore.getState().pasteClipboard();

    const pasted = usePipelineBuilderStore.getState().nodes.find((n) => n.id !== "n1")!;
    expect(pasted.data.config).toEqual({ url: "https://example.com", method: "POST" });
  });

  // --- paste is a no-op with empty clipboard ---

  test("pasteClipboard is a no-op when clipboard is null", () => {
    usePipelineBuilderStore.setState({ nodes: [makeNode({ id: "n1" })] });
    usePipelineBuilderStore.getState().pasteClipboard();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(1);
  });

  test("pasteClipboard is a no-op when clipboard has empty nodes", () => {
    usePipelineBuilderStore.setState({
      nodes: [makeNode({ id: "n1" })],
      clipboard: { nodes: [], edges: [], _pasteCount: 0 },
    });
    usePipelineBuilderStore.getState().pasteClipboard();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(1);
  });

  // --- paste marks dirty ---

  test("paste marks state as dirty", () => {
    const n1 = makeNode({ id: "n1" });
    usePipelineBuilderStore.setState({ nodes: [n1], selectedNodeId: "n1", dirty: false });
    usePipelineBuilderStore.getState().copySelected();
    usePipelineBuilderStore.getState().pasteClipboard();
    expect(usePipelineBuilderStore.getState().dirty).toBe(true);
  });

  // --- paste pushes history (undoable) ---

  test("paste is undoable", () => {
    const n1 = makeNode({ id: "n1" });
    usePipelineBuilderStore.setState({ nodes: [n1], selectedNodeId: "n1" });
    usePipelineBuilderStore.getState().copySelected();
    usePipelineBuilderStore.getState().pasteClipboard();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(2);

    usePipelineBuilderStore.getState().undo();
    expect(usePipelineBuilderStore.getState().nodes).toHaveLength(1);
    expect(usePipelineBuilderStore.getState().nodes[0].id).toBe("n1");
  });

  // --- paste preserves node type ---

  test("paste preserves node type", () => {
    const n1 = makeNode({ id: "n1", type: "sandbox" });
    usePipelineBuilderStore.setState({ nodes: [n1], selectedNodeId: "n1" });
    usePipelineBuilderStore.getState().copySelected();
    usePipelineBuilderStore.getState().pasteClipboard();

    const pasted = usePipelineBuilderStore.getState().nodes.find((n) => n.id !== "n1")!;
    expect(pasted.type).toBe("sandbox");
  });

  // --- multi-paste with selectedNodeId for single ---

  test("paste sets selectedNodeId to null when pasting multiple nodes", () => {
    const n1 = makeNode({ id: "n1", selected: true });
    const n2 = makeNode({ id: "n2", selected: true });
    usePipelineBuilderStore.setState({ nodes: [n1, n2] });

    usePipelineBuilderStore.getState().copySelected();
    usePipelineBuilderStore.getState().pasteClipboard();

    expect(usePipelineBuilderStore.getState().selectedNodeId).toBeNull();
  });

  // --- copy + paste does not mutate original clipboard ---

  test("paste does not mutate the clipboard config objects", () => {
    const config = { url: "https://test.com" };
    const n1 = makeNode({ id: "n1", data: { label: "X", slug: "x", config } });
    usePipelineBuilderStore.setState({ nodes: [n1], selectedNodeId: "n1" });

    usePipelineBuilderStore.getState().copySelected();
    usePipelineBuilderStore.getState().pasteClipboard();

    // Mutate the pasted node's config
    const pasted = usePipelineBuilderStore.getState().nodes.find((n) => n.id !== "n1")!;
    (pasted.data.config as any).url = "mutated";

    // Original clipboard should be unaffected
    const { clipboard } = usePipelineBuilderStore.getState();
    expect(clipboard!.nodes[0].data.config.url).toBe("https://test.com");
  });

  // --- deep nested config is properly cloned ---

  test("paste deep-clones nested config objects", () => {
    const config = { headers: { "Content-Type": "application/json" }, url: "https://test.com" };
    const n1 = makeNode({ id: "n1", data: { label: "X", slug: "x", config } });
    usePipelineBuilderStore.setState({ nodes: [n1], selectedNodeId: "n1" });

    usePipelineBuilderStore.getState().copySelected();
    usePipelineBuilderStore.getState().pasteClipboard();

    // Mutate the nested object on the pasted node
    const pasted = usePipelineBuilderStore.getState().nodes.find((n) => n.id !== "n1")!;
    (pasted.data.config as any).headers["Content-Type"] = "text/plain";

    // Original clipboard's nested object should be unaffected
    const { clipboard } = usePipelineBuilderStore.getState();
    expect((clipboard!.nodes[0].data.config.headers as any)["Content-Type"]).toBe("application/json");
  });
});
