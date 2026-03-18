import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from "@xyflow/react";
import type {
  StepType,
  PipelineNodeType,
  NodeConfig,
} from "@/lib/pipeline/types";
import { defaultConfigs } from "@/lib/pipeline/types";
import { autoWireInputs } from "@/lib/pipeline/auto-wire";
import { handleApiError } from "@/lib/handle-api-error";

export interface PipelineNodeData {
  label: string | null;
  config: Record<string, unknown>;
  [key: string]: unknown;
}

export type PipelineNode = Node<PipelineNodeData, PipelineNodeType>;
export type PipelineEdge = Edge;

export const TRIGGER_NODE_ID = "trigger-source";
const TRIGGER_NODE_DEFAULT_POSITION = { x: 50, y: 50 };

export interface PipelineBuilderState {
  pipelineId: string | null;
  pipelineName: string | null;
  pipelineSlug: string | null;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  selectedNodeId: string | null;
  dirty: boolean;
  saving: boolean;
  saveError: string | null;
  loading: boolean;
  triggerSchema: Record<string, unknown>;

  // xyflow event handlers
  onNodesChange: OnNodesChange<PipelineNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // actions
  setNodes: (nodes: PipelineNode[]) => void;
  setEdges: (edges: PipelineEdge[]) => void;
  selectNode: (nodeId: string | null) => void;
  addNode: (type: StepType, position: { x: number; y: number }) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  deleteSelected: () => void;
  markClean: () => void;

  // trigger schema actions
  setTriggerSchema: (schema: Record<string, unknown>) => void;

  // persistence
  load: (pipelineId: string) => Promise<void>;
  save: () => Promise<void>;
}

const STEP_LABELS: Record<StepType, string> = {
  api_request: "API Request",
  ai_sdk: "AI SDK",
  sandbox: "Sandbox",
  condition: "Condition",
  transform: "Transform",
  metric_capture: "Metric Capture",
};

function makeTriggerNode(position = TRIGGER_NODE_DEFAULT_POSITION): PipelineNode {
  return {
    id: TRIGGER_NODE_ID,
    type: "trigger",
    position,
    data: { label: "Trigger", config: {} },
    deletable: false,
  };
}

export const usePipelineBuilderStore = create<PipelineBuilderState>(
  (set, get) => ({
    pipelineId: null,
    pipelineName: null,
    pipelineSlug: null,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    dirty: false,
    saving: false,
    saveError: null,
    loading: false,
    triggerSchema: {},

    onNodesChange: (changes) => {
      // Prevent trigger node from being removed via keyboard delete / xyflow remove changes
      const safeChanges = changes.filter(
        (c) => !(c.type === "remove" && c.id === TRIGGER_NODE_ID),
      );
      set((state) => ({
        nodes: applyNodeChanges(safeChanges, state.nodes),
        dirty: state.dirty || safeChanges.length > 0,
        saveError: safeChanges.length > 0 ? null : state.saveError,
      }));
    },

    onEdgesChange: (changes) => {
      set((state) => ({
        edges: applyEdgeChanges(changes, state.edges),
        dirty: true,
        saveError: null,
      }));
    },

    onConnect: (connection: Connection) => {
      const edge: PipelineEdge = {
        id: crypto.randomUUID(),
        source: connection.source,
        sourceHandle: connection.sourceHandle ?? null,
        target: connection.target,
        targetHandle: connection.targetHandle ?? null,
      };

      // Precise handle-to-handle wiring: when the trigger schema has named fields,
      // TriggerNode renders a handle per field. Dragging from a named handle writes
      // `trigger.{field}` into the exact config key matching the target handle.
      if (
        connection.source === TRIGGER_NODE_ID &&
        connection.sourceHandle &&
        connection.targetHandle
      ) {
        const fieldName = connection.sourceHandle;
        const targetHandle = connection.targetHandle;
        set((state) => {
          const targetNode = state.nodes.find((n) => n.id === connection.target);
          if (!targetNode || !(targetHandle in (targetNode.data.config ?? {}))) {
            return { edges: [...state.edges, edge], dirty: true, saveError: null };
          }
          return {
            edges: [...state.edges, edge],
            nodes: state.nodes.map((n) =>
              n.id === connection.target
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      config: {
                        ...n.data.config,
                        [targetHandle]: `trigger.${fieldName}`,
                      },
                    },
                  }
                : n,
            ),
            dirty: true,
            saveError: null,
          };
        });
        return;
      }

      // General heuristic auto-wire: fires for step → step connections and for
      // trigger connections without named handles (empty schema / generic handle).
      set((state) => {
        const sourceNode = state.nodes.find((n) => n.id === connection.source);
        const targetNode = state.nodes.find((n) => n.id === connection.target);

        if (!sourceNode || !targetNode) {
          return { edges: [...state.edges, edge], dirty: true, saveError: null };
        }

        const patch = autoWireInputs(
          sourceNode.type ?? "",
          sourceNode.data.label,
          sourceNode.id,
          targetNode.type ?? "",
          targetNode.data.config,
          state.triggerSchema,
        );

        if (!patch) {
          return { edges: [...state.edges, edge], dirty: true, saveError: null };
        }

        return {
          edges: [...state.edges, edge],
          nodes: state.nodes.map((n) =>
            n.id === targetNode.id
              ? { ...n, data: { ...n.data, config: patch.config } }
              : n,
          ),
          dirty: true,
          saveError: null,
        };
      });
    },

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

    addNode: (type, position) => {
      const config = { ...defaultConfigs[type] } as NodeConfig;
      const node: PipelineNode = {
        id: crypto.randomUUID(),
        type,
        position,
        data: {
          label: STEP_LABELS[type],
          config: config as unknown as Record<string, unknown>,
        },
      };
      set((state) => ({
        nodes: [...state.nodes, node],
        dirty: true,
        saveError: null,
      }));
    },

    updateNodeConfig: (nodeId, config) => {
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config } }
            : n,
        ),
        dirty: true,
        saveError: null,
      }));
    },

    updateNodeLabel: (nodeId, label) => {
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, label } }
            : n,
        ),
        dirty: true,
        saveError: null,
      }));
    },

    deleteSelected: () => {
      const { selectedNodeId, nodes, edges } = get();

      const selectedEdge = edges.find((e) => e.selected);
      if (selectedEdge) {
        set({
          edges: edges.filter((e) => e.id !== selectedEdge.id),
          dirty: true,
          saveError: null,
        });
        return;
      }

      // Prevent trigger node deletion
      if (!selectedNodeId || selectedNodeId === TRIGGER_NODE_ID) return;

      set({
        nodes: nodes.filter((n) => n.id !== selectedNodeId),
        edges: edges.filter(
          (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
        ),
        selectedNodeId: null,
        dirty: true,
        saveError: null,
      });
    },

    markClean: () => set({ dirty: false }),

    setTriggerSchema: (schema) => {
      set({ triggerSchema: schema, dirty: true, saveError: null });
    },

    load: async (pipelineId) => {
      set({ loading: true });
      try {
        const res = await fetch(`/api/pipelines/${pipelineId}`);
        if (!res.ok) throw new Error("Failed to load pipeline");
        const data = await res.json();

        const loadedNodes = data.nodes as PipelineNode[];
        const hasTriggerNode = loadedNodes.some((n) => n.type === "trigger");
        const nodes = hasTriggerNode
          ? loadedNodes
          : [makeTriggerNode(), ...loadedNodes];

        const raw = data.triggerSchema;
        const triggerSchema: Record<string, unknown> =
          typeof raw === "object" && raw !== null && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {};

        set({
          pipelineId,
          pipelineName: data.name ?? null,
          pipelineSlug: data.slug ?? null,
          nodes,
          edges: data.edges as PipelineEdge[],
          triggerSchema,
          selectedNodeId: null,
          dirty: false,
        });
      } finally {
        set({ loading: false });
      }
    },

    save: async () => {
      const { pipelineId, nodes, edges, triggerSchema } = get();
      if (!pipelineId) return;

      set({ saving: true, saveError: null });
      try {
        const res = await fetch(`/api/pipelines/${pipelineId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodes, edges, triggerSchema }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = data.error ?? "Failed to save pipeline";
          set({ saveError: message });
          await handleApiError(new Error(message));
          throw new Error(message);
        }
        set({ dirty: false });
      } finally {
        set({ saving: false });
      }
    },
  }),
);
