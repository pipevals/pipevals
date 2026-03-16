"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { RunViewerCanvas } from "./run-viewer-canvas";
import { ResultPanel } from "./result-panel";
import { RunSummary } from "./run-summary";
import { useRunLoader } from "./use-run-loader";

export function RunViewer({
  pipelineId,
  runId,
}: {
  pipelineId: string;
  runId: string;
}) {
  const { loading, error } = useRunLoader(pipelineId, runId);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-xs text-muted-foreground">Loading run…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-screen flex-col">
        <RunSummary />
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1">
            <RunViewerCanvas />
          </div>
          <ResultPanel />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
