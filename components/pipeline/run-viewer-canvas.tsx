"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback } from "react";

import { useRunViewerStore, type RunNode } from "@/lib/stores/run-viewer";
import { nodeTypes } from "./nodes";

export function RunViewerCanvas() {
  const nodes = useRunViewerStore((s) => s.nodes);
  const edges = useRunViewerStore((s) => s.edges);
  const selectNode = useRunViewerStore((s) => s.selectNode);

  const onNodeClick: NodeMouseHandler<RunNode> = useCallback(
    (_event, node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
        deleteKeyCode={null}

        className="bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          className="!bg-muted/30"
        />
        <Controls
          showInteractive={false}
          className="!bg-background !border-border !shadow-sm [&>button]:!bg-background [&>button]:!border-border [&>button]:!fill-foreground hover:[&>button]:!bg-muted"
        />
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
