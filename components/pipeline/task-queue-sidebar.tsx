"use client";

import { cn } from "@/lib/utils";
import { shortId, formatDateTime } from "@/lib/format";
import {
  useTaskReviewStore,
  filterTasks,
  type TaskListItem,
} from "@/lib/stores/task-review";

/** Group sibling tasks (same runId + nodeId) to compute progress. */
function getProgress(
  task: TaskListItem,
  allTasks: TaskListItem[],
): { completed: number; total: number; reviewers: TaskListItem[] } {
  const siblings = allTasks.filter(
    (t) => t.runId === task.runId && t.nodeId === task.nodeId,
  );
  const completed = siblings.filter((t) => t.status === "completed");
  return { completed: completed.length, total: siblings.length, reviewers: completed };
}

const FILTERS = ["all", "pending", "completed"] as const;

export function TaskQueueSidebar() {
  const tasks = useTaskReviewStore((s) => s.tasks);
  const selectedTaskId = useTaskReviewStore((s) => s.selectedTaskId);
  const statusFilter = useTaskReviewStore((s) => s.statusFilter);
  const selectTask = useTaskReviewStore((s) => s.selectTask);
  const setStatusFilter = useTaskReviewStore((s) => s.setStatusFilter);

  const filteredTasks = filterTasks(tasks, statusFilter);
  const pendingCount = tasks.filter((t) => t.status === "pending").length;

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Review Tasks
        </h3>
        <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {pendingCount} pending
        </span>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 border-b border-border px-4 py-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatusFilter(f)}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-medium capitalize transition-colors",
              statusFilter === f
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">
            No {statusFilter === "all" ? "" : statusFilter} tasks
          </div>
        ) : (
          <ul className="flex flex-col">
            {filteredTasks.map((task) => {
              const isSelected = task.id === selectedTaskId;
              const progress = getProgress(task, tasks);
              const allDone =
                progress.completed === progress.total;

              return (
                <li
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectTask(task.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectTask(task.id);
                    }
                  }}
                  className={cn(
                    "cursor-pointer border-b border-border border-l-2 transition-colors",
                    isSelected
                      ? "border-l-foreground bg-muted/50"
                      : "border-l-transparent hover:bg-muted/30",
                  )}
                >
                  <div className="px-4 py-3 pl-[14px]">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        Run #{shortId(task.runId)}
                      </span>
                      <span
                        className={cn(
                          "inline-flex h-2 w-2 rounded-full",
                          allDone ? "bg-emerald-500" : "bg-amber-500",
                        )}
                      />
                    </div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        Review #{task.reviewerIndex + 1}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {progress.completed}/{progress.total} reviewed
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTime(task.createdAt)}
                      </span>
                      {progress.reviewers.length > 0 && (
                        <div className="flex -space-x-1">
                          {progress.reviewers.slice(0, 3).map((r) => (
                            <div
                              key={r.id}
                              className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground ring-1 ring-background"
                              title={r.reviewerName ?? undefined}
                            >
                              {(r.reviewerName ?? "?")[0]?.toUpperCase()}
                            </div>
                          ))}
                          {progress.reviewers.length > 3 && (
                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground ring-1 ring-background">
                              +{progress.reviewers.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
