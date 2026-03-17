import { describe, expect, test, beforeEach, mock } from "bun:test";

// Mock @xyflow/react pure utilities before importing the store
mock.module("@xyflow/react", () => ({
  applyNodeChanges: (
    changes: Array<{ type: string; id: string }>,
    nodes: Array<{ id: string }>,
  ) =>
    changes.reduce(
      (acc, c) => (c.type === "remove" ? acc.filter((n) => n.id !== c.id) : acc),
      nodes,
    ),
  applyEdgeChanges: (_changes: unknown, edges: unknown) => edges,
}));

const { usePipelineBuilderStore, TRIGGER_NODE_ID } = await import(
  "@/lib/stores/pipeline-builder"
);

function resetStore() {
  usePipelineBuilderStore.setState({
    triggerSchema: [],
    nodes: [],
    edges: [],
    selectedNodeId: null,
    dirty: false,
  });
}

describe("pipeline builder store — trigger schema", () => {
  beforeEach(resetStore);

  test("addTriggerField appends a field", () => {
    usePipelineBuilderStore.getState().addTriggerField({ name: "prompt" });
    const { triggerSchema, dirty } = usePipelineBuilderStore.getState();
    expect(triggerSchema).toEqual([{ name: "prompt" }]);
    expect(dirty).toBe(true);
  });

  test("addTriggerField appends multiple fields in order", () => {
    const { addTriggerField } = usePipelineBuilderStore.getState();
    addTriggerField({ name: "prompt" });
    addTriggerField({ name: "model" });
    expect(usePipelineBuilderStore.getState().triggerSchema).toEqual([
      { name: "prompt" },
      { name: "model" },
    ]);
  });

  test("removeTriggerField removes by name", () => {
    usePipelineBuilderStore.setState({
      triggerSchema: [{ name: "prompt" }, { name: "model" }],
    });
    usePipelineBuilderStore.getState().removeTriggerField("prompt");
    expect(usePipelineBuilderStore.getState().triggerSchema).toEqual([
      { name: "model" },
    ]);
  });

  test("updateTriggerField updates description", () => {
    usePipelineBuilderStore.setState({
      triggerSchema: [{ name: "prompt" }],
    });
    usePipelineBuilderStore
      .getState()
      .updateTriggerField("prompt", { description: "The text to evaluate" });
    expect(usePipelineBuilderStore.getState().triggerSchema).toEqual([
      { name: "prompt", description: "The text to evaluate" },
    ]);
  });
});

describe("pipeline builder store — trigger edge wiring", () => {
  beforeEach(resetStore);

  test("onConnect from trigger handle writes trigger.fieldName into matching config field", () => {
    const stepNodeId = "step-1";
    usePipelineBuilderStore.setState({
      nodes: [
        {
          id: TRIGGER_NODE_ID,
          type: "trigger",
          position: { x: 0, y: 0 },
          data: { label: "Trigger", config: {} },
        },
        {
          id: stepNodeId,
          type: "ai_sdk",
          position: { x: 200, y: 0 },
          data: {
            label: "Model",
            config: { model: "openai/gpt-4o", promptTemplate: "" },
          },
        },
      ],
      edges: [],
    });

    usePipelineBuilderStore.getState().onConnect({
      source: TRIGGER_NODE_ID,
      sourceHandle: "prompt",
      target: stepNodeId,
      targetHandle: "promptTemplate",
    });

    const state = usePipelineBuilderStore.getState();
    const stepNode = state.nodes.find((n) => n.id === stepNodeId)!;
    expect(stepNode.data.config.promptTemplate).toBe("trigger.prompt");
    expect(state.edges).toHaveLength(1);
    expect(state.edges[0].sourceHandle).toBe("prompt");
  });

  test("onConnect from trigger handle without matching targetHandle still creates edge", () => {
    const stepNodeId = "step-2";
    usePipelineBuilderStore.setState({
      nodes: [
        {
          id: TRIGGER_NODE_ID,
          type: "trigger",
          position: { x: 0, y: 0 },
          data: { label: "Trigger", config: {} },
        },
        {
          id: stepNodeId,
          type: "ai_sdk",
          position: { x: 200, y: 0 },
          data: { label: "Model", config: { promptTemplate: "" } },
        },
      ],
      edges: [],
    });

    usePipelineBuilderStore.getState().onConnect({
      source: TRIGGER_NODE_ID,
      sourceHandle: "prompt",
      target: stepNodeId,
      targetHandle: null,
    });

    const { edges } = usePipelineBuilderStore.getState();
    expect(edges).toHaveLength(1);
  });
});

describe("pipeline builder store — trigger node deletion guard", () => {
  beforeEach(resetStore);

  test("deleteSelected is a no-op when trigger node is selected", () => {
    usePipelineBuilderStore.setState({
      nodes: [
        {
          id: TRIGGER_NODE_ID,
          type: "trigger",
          position: { x: 0, y: 0 },
          data: { label: "Trigger", config: {} },
        },
      ],
      selectedNodeId: TRIGGER_NODE_ID,
    });

    usePipelineBuilderStore.getState().deleteSelected();

    const { nodes } = usePipelineBuilderStore.getState();
    expect(nodes.find((n) => n.id === TRIGGER_NODE_ID)).toBeDefined();
  });

  test("onNodesChange ignores remove changes for trigger node", () => {
    usePipelineBuilderStore.setState({
      nodes: [
        {
          id: TRIGGER_NODE_ID,
          type: "trigger",
          position: { x: 0, y: 0 },
          data: { label: "Trigger", config: {} },
        },
      ],
    });

    usePipelineBuilderStore
      .getState()
      .onNodesChange([{ type: "remove", id: TRIGGER_NODE_ID }]);

    const { nodes } = usePipelineBuilderStore.getState();
    expect(nodes.find((n) => n.id === TRIGGER_NODE_ID)).toBeDefined();
  });
});
