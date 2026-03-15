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
import {
  usePipelineBuilderStore,
  type PipelineNode,
} from "@/lib/stores/pipeline-builder";

export function PipelineCanvas() {
  const nodes = usePipelineBuilderStore((s) => s.nodes);
  const edges = usePipelineBuilderStore((s) => s.edges);
  const onNodesChange = usePipelineBuilderStore((s) => s.onNodesChange);
  const onEdgesChange = usePipelineBuilderStore((s) => s.onEdgesChange);
  const onConnect = usePipelineBuilderStore((s) => s.onConnect);
  const selectNode = usePipelineBuilderStore((s) => s.selectNode);

  const onNodeClick: NodeMouseHandler<PipelineNode> = useCallback(
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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="!bg-muted/30" />
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
