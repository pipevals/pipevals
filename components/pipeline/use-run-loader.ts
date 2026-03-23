"use client";

import useSWR from "swr";

import {
  useRunViewerStore,
  snapshotToFlow,
  isTerminalRunStatus,
  type RunData,
} from "@/lib/stores/run-viewer";

const POLL_INTERVAL_MS = 2000;
const POLL_INTERVAL_SLOW_MS = 5000;

export function useRunLoader(pipelineId: string, runId: string) {
  const setRun = useRunViewerStore((s) => s.setRun);

  const { data, error, isLoading } = useSWR<RunData>(
    `/api/pipelines/${pipelineId}/runs/${runId}`,
    {
      refreshInterval: (latestData) => {
        if (isTerminalRunStatus(latestData?.status)) return 0;
        if (latestData?.status === "awaiting_review") return POLL_INTERVAL_SLOW_MS;
        return POLL_INTERVAL_MS;
      },
      onSuccess: (run) => {
        const store = useRunViewerStore.getState();
        const { nodes, edges } = snapshotToFlow(
          run.graphSnapshot,
          run.stepResults,
        );
        if (store.run?.id !== run.id) {
          setRun(run);
        } else {
          useRunViewerStore.setState({ run, nodes, edges });
        }
      },
    },
  );

  return {
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    isPolling: !!data && !isTerminalRunStatus(data.status),
  };
}
