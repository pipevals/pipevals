"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  useTaskReviewStore,
  type TaskListItem,
} from "@/lib/stores/task-review";

const POLL_INTERVAL_MS = 5000;

export function useTaskLoader(pipelineId: string) {
  const init = useTaskReviewStore((s) => s.init);
  const setTasks = useTaskReviewStore((s) => s.setTasks);

  useEffect(() => {
    init(pipelineId);
  }, [pipelineId, init]);

  const { isLoading, error, mutate } = useSWR<TaskListItem[]>(
    `/api/pipelines/${pipelineId}/tasks`,
    fetcher,
    {
      refreshInterval: POLL_INTERVAL_MS,
      revalidateOnFocus: false,
      onSuccess: (tasks) => setTasks(tasks),
    },
  );

  return { loading: isLoading, error: error ? String(error) : null, refresh: mutate };
}
