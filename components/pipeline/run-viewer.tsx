"use client";

import dynamic from "next/dynamic";
import { ReactFlowProvider } from "@xyflow/react";
import { ResultPanel } from "./result-panel";
import { RunSummary } from "./run-summary";
import { useRunLoader } from "./use-run-loader";

function RunViewerSkeleton() {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1 bg-muted/30" />
      <div className="w-80 shrink-0 border-l border-border bg-background" />
    </div>
  );
}

const RunViewerCanvas = dynamic(
  () => import("./run-viewer-canvas").then((m) => m.RunViewerCanvas),
  {
    ssr: false,
    loading: () => <RunViewerSkeleton />,
  },
);

export function RunViewer({
  pipelineId,
  runId,
}: {
  pipelineId: string;
  runId: string;
}) {
  const { loading, error } = useRunLoader(pipelineId, runId);

  if (loading) {
    return <RunViewerSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="flex flex-1 flex-col">
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
