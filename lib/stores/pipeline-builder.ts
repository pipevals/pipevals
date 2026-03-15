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
import type { StepType, NodeConfig } from "@/lib/pipeline/types";
import { defaultConfigs } from "@/lib/pipeline/types";

export interface PipelineNodeData {
  label: string | null;
  config: Record<string, unknown>;
  [key: string]: unknown;
}

export type PipelineNode = Node<PipelineNodeData, StepType>;
export type PipelineEdge = Edge;

export interface PipelineBuilderState {
  pipelineId: string | null;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  selectedNodeId: string | null;
  dirty: boolean;
  saving: boolean;
  loading: boolean;

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

export const usePipelineBuilderStore = create<PipelineBuilderState>(
  (set, get) => ({
    pipelineId: null,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    dirty: false,
    saving: false,
    loading: false,

    onNodesChange: (changes) => {
      set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes),
        dirty: true,
      }));
    },

    onEdgesChange: (changes) => {
      set((state) => ({
        edges: applyEdgeChanges(changes, state.edges),
        dirty: true,
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
      set((state) => ({
        edges: [...state.edges, edge],
        dirty: true,
      }));
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
      }));
    },

    deleteSelected: () => {
      const { selectedNodeId, nodes, edges } = get();

      const selectedEdge = edges.find((e) => e.selected);
      if (selectedEdge) {
        set({
          edges: edges.filter((e) => e.id !== selectedEdge.id),
          dirty: true,
        });
        return;
      }

      if (!selectedNodeId) return;

      set({
        nodes: nodes.filter((n) => n.id !== selectedNodeId),
        edges: edges.filter(
          (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
        ),
        selectedNodeId: null,
        dirty: true,
      });
    },

    markClean: () => set({ dirty: false }),

    load: async (pipelineId) => {
      set({ loading: true });
      try {
        const res = await fetch(`/api/pipelines/${pipelineId}`);
        if (!res.ok) throw new Error("Failed to load pipeline");
        const data = await res.json();
        set({
          pipelineId,
          nodes: data.nodes as PipelineNode[],
          edges: data.edges as PipelineEdge[],
          selectedNodeId: null,
          dirty: false,
        });
      } finally {
        set({ loading: false });
      }
    },

    save: async () => {
      const { pipelineId, nodes, edges } = get();
      if (!pipelineId) return;

      set({ saving: true });
      try {
        const res = await fetch(`/api/pipelines/${pipelineId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodes, edges }),
        });
        if (!res.ok) throw new Error("Failed to save pipeline");
        set({ dirty: false });
      } finally {
        set({ saving: false });
      }
    },
  }),
);
