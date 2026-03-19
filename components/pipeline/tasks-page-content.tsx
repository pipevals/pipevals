"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { TaskQueueSidebar } from "./task-queue-sidebar";
import { TaskReviewPanel } from "./task-review-panel";

export interface TaskListItem {
  id: string;
  runId: string;
  nodeId: string;
  status: "pending" | "completed";
  reviewerIndex: number;
  reviewedBy: string | null;
  createdAt: string;
  completedAt: string | null;
  reviewerName: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TasksPageContent({ pipelineId }: { pipelineId: string }) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "completed"
  >("all");

  const { data: tasks, mutate } = useSWR<TaskListItem[]>(
    `/api/pipelines/${pipelineId}/tasks`,
    fetcher,
    { refreshInterval: 5000 },
  );

  const filteredTasks = (tasks ?? []).filter((t) =>
    statusFilter === "all" ? true : t.status === statusFilter,
  );

  // Auto-select first task on load, or re-select when the current selection is filtered out
  useEffect(() => {
    if (selectedTaskId === null || !filteredTasks.some((t) => t.id === selectedTaskId)) {
      setSelectedTaskId(filteredTasks[0]?.id ?? null);
    }
  }, [filteredTasks, selectedTaskId]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <TaskQueueSidebar
        tasks={filteredTasks}
        allTasks={tasks ?? []}
        selectedTaskId={selectedTaskId}
        onSelect={setSelectedTaskId}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />
      <main className="flex flex-1 flex-col overflow-y-auto bg-muted/30">
        {selectedTaskId ? (
          <TaskReviewPanel
            key={selectedTaskId}
            taskId={selectedTaskId}
            allTasks={tasks ?? []}
            onSubmitted={() => mutate()}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a task from the sidebar to review
          </div>
        )}
      </main>
    </div>
  );
}
