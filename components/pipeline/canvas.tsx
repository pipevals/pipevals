"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type NodeMouseHandler,
  type IsValidConnection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, type DragEvent } from "react";

import {
  usePipelineBuilderStore,
  TRIGGER_NODE_ID,
  type PipelineNode,
} from "@/lib/stores/pipeline-builder";
import { wouldCreateCycle } from "@/lib/pipeline/graph-validation";
import { nodeTypes } from "./nodes";
import { DRAG_TYPE_KEY } from "./node-palette";
import type { StepType } from "@/lib/pipeline/types";

export function PipelineCanvas() {
  const nodes = usePipelineBuilderStore((s) => s.nodes);
  const edges = usePipelineBuilderStore((s) => s.edges);
  const onNodesChange = usePipelineBuilderStore((s) => s.onNodesChange);
  const onEdgesChange = usePipelineBuilderStore((s) => s.onEdgesChange);
  const onConnect = usePipelineBuilderStore((s) => s.onConnect);
  const selectNode = usePipelineBuilderStore((s) => s.selectNode);
  const addNode = usePipelineBuilderStore((s) => s.addNode);
  const { screenToFlowPosition } = useReactFlow();

  const undo = usePipelineBuilderStore((s) => s.undo);
  const redo = usePipelineBuilderStore((s) => s.redo);
  const copySelected = usePipelineBuilderStore((s) => s.copySelected);
  const pasteClipboard = usePipelineBuilderStore((s) => s.pasteClipboard);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Ignore when typing in an input/textarea/contentEditable
      const el = e.target as HTMLElement;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;

      if (e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "c") {
        e.preventDefault();
        copySelected();
      } else if (e.key === "v") {
        e.preventDefault();
        pasteClipboard();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo, copySelected, pasteClipboard]);

  const onNodeClick: NodeMouseHandler<PipelineNode> = useCallback(
    (_event, node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      const source = connection.source;
      const target = connection.target;
      if (!source || !target) return false;
      if (source === target) return false;
      return !wouldCreateCycle(edges, source, target);
    },
    [edges],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(DRAG_TYPE_KEY) as StepType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [screenToFlowPosition, addNode],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        isValidConnection={isValidConnection}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}

        className="bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          className="!bg-muted/30"
        />
        <Controls className="!bg-background !border-border !shadow-sm [&>button]:!bg-background [&>button]:!border-border [&>button]:!fill-foreground hover:[&>button]:!bg-muted" />
        <MiniMap
          className="!bg-background !border-border !shadow-sm"
          nodeColor="hsl(var(--primary))"
          maskColor="hsl(var(--muted) / 0.7)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
