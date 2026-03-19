"use client";

import type { TaskListItem } from "./tasks-page-content";

export function TaskReviewPanel(_props: {
  taskId: string;
  allTasks: TaskListItem[];
  onSubmitted: () => void;
}) {
  // Placeholder — implemented in tasks 7.x
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Loading review...
    </div>
  );
}
