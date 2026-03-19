"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  useRunViewerStore,
  snapshotToFlow,
  isTerminalRunStatus,
  type RunData,
} from "@/lib/stores/run-viewer";

const POLL_INTERVAL_MS = 2000;

export function useRunLoader(pipelineId: string, runId: string) {
  const setRun = useRunViewerStore((s) => s.setRun);

  const { data, error, isLoading } = useSWR<RunData>(
    `/api/pipelines/${pipelineId}/runs/${runId}`,
    fetcher,
    {
      refreshInterval: (latestData) =>
        isTerminalRunStatus(latestData?.status) ? 0 : POLL_INTERVAL_MS,
      revalidateOnFocus: false,
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
