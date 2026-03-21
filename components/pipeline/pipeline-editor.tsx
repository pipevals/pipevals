"use client";

import dynamic from "next/dynamic";
import { ReactFlowProvider } from "@xyflow/react";
import { NodePalette } from "./node-palette";
import { ConfigPanel } from "./config-panel";
import { usePipelineLoader } from "./use-pipeline-loader";

function EditorSkeleton() {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="w-56 shrink-0 border-r border-border bg-background" />
      <div className="min-w-0 flex-1 bg-muted/30" />
      <div className="w-72 shrink-0 border-l border-border bg-background" />
    </div>
  );
}

const PipelineCanvas = dynamic(() => import("./canvas").then((m) => m.PipelineCanvas), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

export function PipelineEditor({ pipelineId }: { pipelineId: string }) {
  const { loading } = usePipelineLoader(pipelineId);

  if (loading) {
    return <EditorSkeleton />;
  }

  return (
    <ReactFlowProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <NodePalette />
          <div className="min-w-0 flex-1">
            <PipelineCanvas />
          </div>
          <ConfigPanel />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
