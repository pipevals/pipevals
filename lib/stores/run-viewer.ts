import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type { PipelineNodeData } from "./pipeline-builder";

export type RunNode = Node<PipelineNodeData>;
export type RunEdge = Edge;

export type RunStatus = "pending" | "running" | "completed" | "failed";
export type StepResultStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface StepResult {
  id: string;
  runId: string;
  nodeId: string;
  status: StepResultStatus;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  durationMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface GraphSnapshot {
  nodes: {
    id: string;
    type: string;
    label: string | null;
    config: Record<string, unknown>;
    positionX: number;
    positionY: number;
  }[];
  edges: {
    id: string;
    sourceNodeId: string;
    sourceHandle: string | null;
    targetNodeId: string;
    targetHandle: string | null;
    label: string | null;
  }[];
}

export interface RunData {
  id: string;
  pipelineId: string;
  status: RunStatus;
  triggerPayload: Record<string, unknown> | null;
  graphSnapshot: GraphSnapshot;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  stepResults: StepResult[];
}

export interface RunViewerState {
  run: RunData | null;
  nodes: RunNode[];
  edges: RunEdge[];
  selectedNodeId: string | null;
  loading: boolean;

  selectNode: (nodeId: string | null) => void;
  load: (pipelineId: string, runId: string) => Promise<void>;
  setRun: (run: RunData) => void;
}

function snapshotToFlow(snapshot: GraphSnapshot): {
  nodes: RunNode[];
  edges: RunEdge[];
} {
  const nodes: RunNode[] = snapshot.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: n.positionX, y: n.positionY },
    data: {
      label: n.label,
      config: n.config,
    },
    draggable: false,
    connectable: false,
    selectable: true,
  }));

  const edges: RunEdge[] = snapshot.edges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    sourceHandle: e.sourceHandle ?? undefined,
    target: e.targetNodeId,
    targetHandle: e.targetHandle ?? undefined,
    label: e.label ?? undefined,
  }));

  return { nodes, edges };
}

export const useRunViewerStore = create<RunViewerState>((set) => ({
  run: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  loading: false,

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setRun: (run) => {
    const { nodes, edges } = snapshotToFlow(run.graphSnapshot);
    set({ run, nodes, edges });
  },

  load: async (pipelineId, runId) => {
    set({ loading: true });
    try {
      const res = await fetch(
        `/api/pipelines/${pipelineId}/runs/${runId}`,
      );
      if (!res.ok) throw new Error("Failed to load run");
      const data: RunData = await res.json();
      const { nodes, edges } = snapshotToFlow(data.graphSnapshot);
      set({ run: data, nodes, edges, selectedNodeId: null });
    } finally {
      set({ loading: false });
    }
  },
}));
