import { create } from "zustand";

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

export type TaskStatusFilter = "all" | "pending" | "completed";

export interface TaskReviewState {
  pipelineId: string | null;
  tasks: TaskListItem[];
  selectedTaskId: string | null;
  statusFilter: TaskStatusFilter;

  // actions
  init: (pipelineId: string) => void;
  setTasks: (tasks: TaskListItem[]) => void;
  selectTask: (taskId: string | null) => void;
  setStatusFilter: (filter: TaskStatusFilter) => void;
}

export const useTaskReviewStore = create<TaskReviewState>((set, get) => ({
  pipelineId: null,
  tasks: [],
  selectedTaskId: null,
  statusFilter: "all",

  init: (pipelineId) => set({ pipelineId, tasks: [], selectedTaskId: null, statusFilter: "all" }),

  setTasks: (tasks) => {
    const { selectedTaskId, statusFilter } = get();
    const filtered = filterTasks(tasks, statusFilter);
    // Auto-select first task if current selection is gone
    const stillExists = filtered.some((t) => t.id === selectedTaskId);
    set({
      tasks,
      selectedTaskId: stillExists ? selectedTaskId : (filtered[0]?.id ?? null),
    });
  },

  selectTask: (taskId) => set({ selectedTaskId: taskId }),

  setStatusFilter: (statusFilter) => {
    const { tasks, selectedTaskId } = get();
    const filtered = filterTasks(tasks, statusFilter);
    const stillExists = filtered.some((t) => t.id === selectedTaskId);
    set({
      statusFilter,
      selectedTaskId: stillExists ? selectedTaskId : (filtered[0]?.id ?? null),
    });
  },
}));

export function filterTasks(
  tasks: TaskListItem[],
  filter: TaskStatusFilter,
): TaskListItem[] {
  if (filter === "all") return tasks;
  return tasks.filter((t) => t.status === filter);
}
