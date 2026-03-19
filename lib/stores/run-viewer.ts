import type React from "react";
import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type { PipelineNodeData } from "./pipeline-builder";

export type RunNode = Node<PipelineNodeData>;
export type RunEdge = Edge;

export type RunStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
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
  pipelineSlug: string | null;
  status: RunStatus;
  triggerPayload: Record<string, unknown> | null;
  triggerSchema: Record<string, unknown>;
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
  error: string | null;

  selectNode: (nodeId: string | null) => void;
  load: (pipelineId: string, runId: string) => Promise<void>;
  setRun: (run: RunData) => void;
}

export function buildStepStatusMap(
  stepResults: StepResult[],
): Record<string, StepResultStatus> {
  const map: Record<string, StepResultStatus> = {};
  for (const sr of stepResults) {
    map[sr.nodeId] = sr.status;
  }
  return map;
}

export type EdgeState = "traversed" | "active" | "inactive" | "pending";

export const EDGE_STYLES: Record<EdgeState, { style: React.CSSProperties; animated: boolean }> = {
  traversed: {
    style: { stroke: "var(--primary)", strokeWidth: 2, opacity: 1 },
    animated: false,
  },
  active: {
    style: { stroke: "var(--primary)", strokeWidth: 2, opacity: 1 },
    animated: true,
  },
  inactive: {
    style: { stroke: "var(--muted-foreground)", strokeWidth: 1, opacity: 0.25, strokeDasharray: "5 5" },
    animated: false,
  },
  pending: {
    style: { stroke: "var(--muted-foreground)", strokeWidth: 1, opacity: 0.5 },
    animated: false,
  },
};

export function computeEdgeState(
  edge: GraphSnapshot["edges"][number],
  statusMap: Record<string, StepResultStatus>,
  resultMap: Record<string, StepResult>,
  nodeTypeMap: Record<string, string>,
): EdgeState {
  const sourceStatus = statusMap[edge.sourceNodeId];
  const targetStatus = statusMap[edge.targetNodeId];
  const sourceType = nodeTypeMap[edge.sourceNodeId];

  if (sourceType === "condition" && sourceStatus && sourceStatus !== "pending") {
    const sourceResult = resultMap[edge.sourceNodeId];
    const activeBranch = (sourceResult?.output as { branch?: string } | null)?.branch;
    if (activeBranch && edge.sourceHandle !== activeBranch) {
      return "inactive";
    }
  }

  if (sourceStatus === "skipped") return "inactive";

  const sourceFinished = sourceStatus === "completed" || sourceStatus === "failed";
  const targetFinished = targetStatus === "completed" || targetStatus === "failed";

  if (sourceFinished && targetFinished) return "traversed";
  if (sourceFinished && (targetStatus === "running" || targetStatus === "pending")) return "active";
  if (targetStatus === "skipped") return "inactive";
  return "pending";
}

export function snapshotToFlow(
  snapshot: GraphSnapshot,
  stepResults: StepResult[] = [],
): {
  nodes: RunNode[];
  edges: RunEdge[];
} {
  const statusMap = buildStepStatusMap(stepResults);
  const resultMap: Record<string, StepResult> = {};
  for (const sr of stepResults) {
    resultMap[sr.nodeId] = sr;
  }
  const nodeTypeMap: Record<string, string> = {};
  for (const n of snapshot.nodes) {
    nodeTypeMap[n.id] = n.type;
  }

  const nodes: RunNode[] = snapshot.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: n.positionX, y: n.positionY },
    data: {
      label: n.label,
      config: n.config,
      stepStatus: statusMap[n.id] ?? ("pending" as StepResultStatus),
    },
    draggable: false,
    connectable: false,
    selectable: true,
  }));

  const edges: RunEdge[] = snapshot.edges.map((e) => {
    const state = computeEdgeState(e, statusMap, resultMap, nodeTypeMap);
    const { style, animated } = EDGE_STYLES[state];
    return {
      id: e.id,
      source: e.sourceNodeId,
      sourceHandle: e.sourceHandle ?? undefined,
      target: e.targetNodeId,
      targetHandle: e.targetHandle ?? undefined,
      label: e.label ?? undefined,
      style,
      animated,
    };
  });

  return { nodes, edges };
}

export const useRunViewerStore = create<RunViewerState>((set) => ({
  run: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  loading: false,
  error: null,

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setRun: (run) => {
    const { nodes, edges } = snapshotToFlow(
      run.graphSnapshot,
      run.stepResults,
    );
    set({ run, nodes, edges });
  },

  load: async (pipelineId, runId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(
        `/api/pipelines/${pipelineId}/runs/${runId}`,
      );
      if (!res.ok) throw new Error("Failed to load run");
      const data: RunData = await res.json();
      const { nodes, edges } = snapshotToFlow(
        data.graphSnapshot,
        data.stepResults,
      );
      set({ run: data, nodes, edges, selectedNodeId: null });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load run",
      });
    } finally {
      set({ loading: false });
    }
  },
}));
