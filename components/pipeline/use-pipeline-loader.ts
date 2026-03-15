"use client";

import { useEffect } from "react";
import { usePipelineBuilderStore } from "@/lib/stores/pipeline-builder";

export function usePipelineLoader(pipelineId: string) {
  const load = usePipelineBuilderStore((s) => s.load);
  const loading = usePipelineBuilderStore((s) => s.loading);

  useEffect(() => {
    load(pipelineId).catch(() => {});
  }, [pipelineId, load]);

  return { loading };
}
