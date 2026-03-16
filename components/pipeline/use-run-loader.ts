"use client";

import { useEffect } from "react";
import { useRunViewerStore } from "@/lib/stores/run-viewer";

export function useRunLoader(pipelineId: string, runId: string) {
  const loading = useRunViewerStore((s) => s.loading);
  const error = useRunViewerStore((s) => s.error);
  const run = useRunViewerStore((s) => s.run);
  const load = useRunViewerStore((s) => s.load);

  useEffect(() => {
    load(pipelineId, runId);
  }, [pipelineId, runId, load]);

  return { loading: loading || (!run && !error), error };
}
