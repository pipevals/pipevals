"use client";

import { useTaskReviewStore } from "@/lib/stores/task-review";
import { useTaskLoader } from "./use-task-loader";
import { TaskQueueSidebar } from "./task-queue-sidebar";
import { TaskReviewPanel } from "./task-review-panel";

export function TasksPageContent({ pipelineId }: { pipelineId: string }) {
  const { refresh } = useTaskLoader(pipelineId);
  const selectedTaskId = useTaskReviewStore((s) => s.selectedTaskId);

  return (
    <div className="flex flex-1 overflow-hidden">
      <TaskQueueSidebar />
      <main className="flex flex-1 flex-col overflow-y-auto bg-muted/30">
        {selectedTaskId ? (
          <TaskReviewPanel
            key={selectedTaskId}
            onSubmitted={() => refresh()}
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
