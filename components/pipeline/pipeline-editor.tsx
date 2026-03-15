"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { PipelineCanvas } from "./canvas";
import { NodePalette } from "./node-palette";
import { ConfigPanel } from "./config-panel";
import { PipelineToolbar } from "./toolbar";
import { usePipelineLoader } from "./use-pipeline-loader";

export function PipelineEditor({ pipelineId }: { pipelineId: string }) {
  const { loading } = usePipelineLoader(pipelineId);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-xs text-muted-foreground">Loading pipeline…</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-screen flex-col">
        <PipelineToolbar />
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
