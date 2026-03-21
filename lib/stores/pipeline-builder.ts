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
import { stepSlugify } from "@/lib/slugify";
import { handleApiError } from "@/lib/handle-api-error";

export interface PipelineNodeData {
  label: string | null;
  slug: string | null;
  config: Record<string, unknown>;
  [key: string]: unknown;
}

export type PipelineNode = Node<PipelineNodeData, PipelineNodeType>;
export type PipelineEdge = Edge;

export const TRIGGER_NODE_ID = "trigger-source";
const TRIGGER_NODE_DEFAULT_POSITION = { x: 50, y: 50 };

// ---------------------------------------------------------------------------
// History (undo / redo)
// ---------------------------------------------------------------------------

interface HistorySnapshot {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  triggerSchema: Record<string, unknown>;
}

const MAX_HISTORY = 50;

// ---------------------------------------------------------------------------
// Clipboard (copy / paste)
// ---------------------------------------------------------------------------

export interface ClipboardPayload {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  _pasteCount: number;
}

const PASTE_OFFSET = 50;

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

  // history
  _history: HistorySnapshot[];
  _future: HistorySnapshot[];

  // clipboard
  clipboard: ClipboardPayload | null;

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
  updateNodeSlug: (nodeId: string, slug: string) => void;
  deleteSelected: () => void;
  markClean: () => void;

  // trigger schema actions
  setTriggerSchema: (schema: Record<string, unknown>) => void;

  // undo / redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // copy / paste
  copySelected: () => void;
  pasteClipboard: () => void;

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
  human_review: "Human Review",
};

function makeTriggerNode(position = TRIGGER_NODE_DEFAULT_POSITION): PipelineNode {
  return {
    id: TRIGGER_NODE_ID,
    type: "trigger",
    position,
    data: { label: "Trigger", slug: null, config: {} },
    deletable: false,
  };
}

/** Take a snapshot of the trackable state for the history stack. */
function takeSnapshot(state: PipelineBuilderState): HistorySnapshot {
  return {
    nodes: state.nodes,
    edges: state.edges,
    triggerSchema: state.triggerSchema,
  };
}

/** Push current state onto the undo stack and clear the redo stack. */
function pushHistory(state: PipelineBuilderState): Pick<PipelineBuilderState, "_history" | "_future"> {
  const snapshot = takeSnapshot(state);
  const history = [...state._history, snapshot];
  if (history.length > MAX_HISTORY) history.shift();
  return { _history: history, _future: [] };
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
    _history: [],
    _future: [],
    clipboard: null,

    onNodesChange: (changes) => {
      // Prevent trigger node from being removed via keyboard delete / xyflow remove changes
      const safeChanges = changes.filter(
        (c) => !(c.type === "remove" && c.id === TRIGGER_NODE_ID),
      );
      // Dimension changes are internal ReactFlow measurements, not user edits
      const userChanges = safeChanges.filter(
        (c) => c.type !== "dimensions",
      );
      // While a node is being dragged, suppress history pushes — only push on
      // the final position event (dragging: false) so a full drag is one undo step.
      const isDragging = safeChanges.some(
        (c) => c.type === "position" && (c as any).dragging,
      );
      set((state) => ({
        ...(userChanges.length > 0 && !isDragging ? pushHistory(state) : {}),
        nodes: applyNodeChanges(safeChanges, state.nodes),
        dirty: state.dirty || userChanges.length > 0,
        saveError: userChanges.length > 0 ? null : state.saveError,
      }));
    },

    onEdgesChange: (changes) => {
      // Selection changes are not user edits — don't push history or mark dirty
      const userChanges = changes.filter((c) => c.type !== "select");
      set((state) => ({
        ...(userChanges.length > 0 ? pushHistory(state) : {}),
        edges: applyEdgeChanges(changes, state.edges),
        dirty: state.dirty || userChanges.length > 0,
        saveError: userChanges.length > 0 ? null : state.saveError,
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
            return { ...pushHistory(state), edges: [...state.edges, edge], dirty: true, saveError: null };
          }
          return {
            ...pushHistory(state),
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
          return { ...pushHistory(state), edges: [...state.edges, edge], dirty: true, saveError: null };
        }

        const patch = autoWireInputs(
          sourceNode.type ?? "",
          sourceNode.data.slug,
          sourceNode.id,
          targetNode.type ?? "",
          targetNode.data.config,
          state.triggerSchema,
        );

        if (!patch) {
          return { ...pushHistory(state), edges: [...state.edges, edge], dirty: true, saveError: null };
        }

        return {
          ...pushHistory(state),
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
      const label = STEP_LABELS[type];
      const node: PipelineNode = {
        id: crypto.randomUUID(),
        type,
        position,
        data: {
          label,
          slug: stepSlugify(label),
          config: config as unknown as Record<string, unknown>,
        },
      };
      set((state) => ({
        ...pushHistory(state),
        nodes: [...state.nodes, node],
        dirty: true,
        saveError: null,
      }));
    },

    updateNodeConfig: (nodeId, config) => {
      set((state) => ({
        ...pushHistory(state),
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
        ...pushHistory(state),
        nodes: state.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, label, slug: stepSlugify(label) || n.data.slug } }
            : n,
        ),
        dirty: true,
        saveError: null,
      }));
    },

    updateNodeSlug: (nodeId, slug) => {
      set((state) => ({
        ...pushHistory(state),
        nodes: state.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, slug } }
            : n,
        ),
        dirty: true,
        saveError: null,
      }));
    },

    deleteSelected: () => {
      const state = get();
      const { selectedNodeId, nodes, edges } = state;

      const selectedEdge = edges.find((e) => e.selected);
      if (selectedEdge) {
        set({
          ...pushHistory(state),
          edges: edges.filter((e) => e.id !== selectedEdge.id),
          dirty: true,
          saveError: null,
        });
        return;
      }

      // Prevent trigger node deletion
      if (!selectedNodeId || selectedNodeId === TRIGGER_NODE_ID) return;

      set({
        ...pushHistory(state),
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
      set((state) => ({
        ...pushHistory(state),
        triggerSchema: schema,
        dirty: true,
        saveError: null,
      }));
    },

    // undo / redo
    undo: () => {
      const state = get();
      if (state._history.length === 0) return;
      const previous = state._history[state._history.length - 1];
      set({
        _history: state._history.slice(0, -1),
        _future: [takeSnapshot(state), ...state._future],
        nodes: previous.nodes,
        edges: previous.edges,
        triggerSchema: previous.triggerSchema,
        dirty: true,
        saveError: null,
      });
    },

    redo: () => {
      const state = get();
      if (state._future.length === 0) return;
      const next = state._future[0];
      set({
        _future: state._future.slice(1),
        _history: [...state._history, takeSnapshot(state)],
        nodes: next.nodes,
        edges: next.edges,
        triggerSchema: next.triggerSchema,
        dirty: true,
        saveError: null,
      });
    },

    canUndo: () => get()._history.length > 0,
    canRedo: () => get()._future.length > 0,

    // copy / paste
    copySelected: () => {
      const { nodes, edges, selectedNodeId } = get();

      // Collect selected nodes (from xyflow `selected` flag or selectedNodeId)
      const selectedNodes = nodes.filter(
        (n) =>
          n.id !== TRIGGER_NODE_ID &&
          (n.selected || n.id === selectedNodeId),
      );
      if (selectedNodes.length === 0) return;

      const selectedIds = new Set(selectedNodes.map((n) => n.id));
      // Include edges whose both endpoints are selected
      const selectedEdges = edges.filter(
        (e) => selectedIds.has(e.source) && selectedIds.has(e.target),
      );

      set({ clipboard: { nodes: selectedNodes, edges: selectedEdges, _pasteCount: 0 } });
    },

    pasteClipboard: () => {
      const { clipboard } = get();
      if (!clipboard || clipboard.nodes.length === 0) return;

      const pasteNum = clipboard._pasteCount + 1;
      const offset = PASTE_OFFSET * pasteNum;

      // Build ID mapping: old id → new id
      const idMap = new Map<string, string>();
      for (const node of clipboard.nodes) {
        idMap.set(node.id, crypto.randomUUID());
      }

      const newNodes: PipelineNode[] = clipboard.nodes.map((n) => ({
        ...n,
        id: idMap.get(n.id)!,
        position: { x: n.position.x + offset, y: n.position.y + offset },
        selected: true,
        data: { ...n.data, config: structuredClone(n.data.config) },
      }));

      const newEdges: PipelineEdge[] = clipboard.edges
        .filter((e) => idMap.has(e.source) && idMap.has(e.target))
        .map((e) => ({
          ...e,
          id: crypto.randomUUID(),
          source: idMap.get(e.source)!,
          target: idMap.get(e.target)!,
        }));

      set((state) => ({
        ...pushHistory(state),
        // Deselect existing nodes
        nodes: [
          ...state.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
          ...newNodes,
        ],
        edges: [...state.edges, ...newEdges],
        selectedNodeId: newNodes.length === 1 ? newNodes[0].id : null,
        clipboard: { ...clipboard, _pasteCount: pasteNum },
        dirty: true,
        saveError: null,
      }));
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
          _history: [],
          _future: [],
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
