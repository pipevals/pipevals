"use client";

import dynamic from "next/dynamic";
import { ReactFlowProvider } from "@xyflow/react";
import { NodePalette } from "./node-palette";
import { ConfigPanel } from "./config-panel";
import { usePipelineLoader } from "./use-pipeline-loader";

const PipelineCanvas = dynamic(() => import("./canvas").then((m) => m.PipelineCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted/30">
      <p className="text-xs text-muted-foreground">Loading canvas…</p>
    </div>
  ),
});

export function PipelineEditor({ pipelineId }: { pipelineId: string }) {
  const { loading } = usePipelineLoader(pipelineId);

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-xs text-muted-foreground">Loading pipeline…</p>
      </div>
    );
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
