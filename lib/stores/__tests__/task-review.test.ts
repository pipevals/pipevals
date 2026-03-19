import { describe, test, expect, beforeEach } from "bun:test";

import {
  useTaskReviewStore,
  filterTasks,
  type TaskListItem,
} from "@/lib/stores/task-review";

function resetStore() {
  useTaskReviewStore.setState(useTaskReviewStore.getInitialState(), true);
}

function makeTask(
  overrides: Partial<TaskListItem> & { id: string },
): TaskListItem {
  return {
    runId: "run-1",
    nodeId: "node-1",
    status: "pending",
    reviewerIndex: 0,
    reviewedBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    completedAt: null,
    reviewerName: null,
    ...overrides,
  };
}

beforeEach(resetStore);

// -------------------------------------------------------------------
// init
// -------------------------------------------------------------------

describe("init", () => {
  test("sets pipelineId and resets state", () => {
    const store = useTaskReviewStore;
    store.getState().selectTask("old-task");
    store.getState().init("pipe-1");

    const s = store.getState();
    expect(s.pipelineId).toBe("pipe-1");
    expect(s.tasks).toEqual([]);
    expect(s.selectedTaskId).toBeNull();
    expect(s.statusFilter).toBe("all");
  });
});

// -------------------------------------------------------------------
// setTasks
// -------------------------------------------------------------------

describe("setTasks", () => {
  test("stores tasks and auto-selects first", () => {
    const store = useTaskReviewStore;
    const tasks = [makeTask({ id: "t1" }), makeTask({ id: "t2" })];

    store.getState().setTasks(tasks);

    const s = store.getState();
    expect(s.tasks).toHaveLength(2);
    expect(s.selectedTaskId).toBe("t1");
  });

  test("preserves selection if still valid", () => {
    const store = useTaskReviewStore;
    store.getState().selectTask("t2");

    store.getState().setTasks([
      makeTask({ id: "t1" }),
      makeTask({ id: "t2" }),
    ]);

    expect(store.getState().selectedTaskId).toBe("t2");
  });

  test("re-selects first if current selection is gone", () => {
    const store = useTaskReviewStore;
    store.getState().selectTask("t-gone");

    store.getState().setTasks([
      makeTask({ id: "t1" }),
      makeTask({ id: "t2" }),
    ]);

    expect(store.getState().selectedTaskId).toBe("t1");
  });

  test("clears selection when tasks are empty", () => {
    const store = useTaskReviewStore;
    store.getState().selectTask("t1");
    store.getState().setTasks([]);

    expect(store.getState().selectedTaskId).toBeNull();
  });

  test("respects active status filter for auto-selection", () => {
    const store = useTaskReviewStore;
    store.getState().setStatusFilter("completed");

    store.getState().setTasks([
      makeTask({ id: "t1", status: "pending" }),
      makeTask({ id: "t2", status: "completed" }),
    ]);

    // t1 is filtered out, so t2 should be auto-selected
    expect(store.getState().selectedTaskId).toBe("t2");
  });
});

// -------------------------------------------------------------------
// selectTask
// -------------------------------------------------------------------

describe("selectTask", () => {
  test("sets selectedTaskId", () => {
    useTaskReviewStore.getState().selectTask("t1");
    expect(useTaskReviewStore.getState().selectedTaskId).toBe("t1");
  });

  test("can clear selection with null", () => {
    useTaskReviewStore.getState().selectTask("t1");
    useTaskReviewStore.getState().selectTask(null);
    expect(useTaskReviewStore.getState().selectedTaskId).toBeNull();
  });
});

// -------------------------------------------------------------------
// setStatusFilter
// -------------------------------------------------------------------

describe("setStatusFilter", () => {
  test("updates filter value", () => {
    useTaskReviewStore.getState().setStatusFilter("pending");
    expect(useTaskReviewStore.getState().statusFilter).toBe("pending");
  });

  test("preserves selection if still visible after filter change", () => {
    const store = useTaskReviewStore;
    store.getState().setTasks([
      makeTask({ id: "t1", status: "pending" }),
      makeTask({ id: "t2", status: "completed" }),
    ]);
    store.getState().selectTask("t1");

    store.getState().setStatusFilter("pending");

    expect(store.getState().selectedTaskId).toBe("t1");
  });

  test("re-selects first visible task if current selection is filtered out", () => {
    const store = useTaskReviewStore;
    store.getState().setTasks([
      makeTask({ id: "t1", status: "pending" }),
      makeTask({ id: "t2", status: "completed" }),
    ]);
    store.getState().selectTask("t1");

    store.getState().setStatusFilter("completed");

    expect(store.getState().selectedTaskId).toBe("t2");
  });

  test("clears selection if no tasks match the filter", () => {
    const store = useTaskReviewStore;
    store.getState().setTasks([
      makeTask({ id: "t1", status: "pending" }),
    ]);
    store.getState().selectTask("t1");

    store.getState().setStatusFilter("completed");

    expect(store.getState().selectedTaskId).toBeNull();
  });
});

// -------------------------------------------------------------------
// filterTasks
// -------------------------------------------------------------------

describe("filterTasks", () => {
  const tasks = [
    makeTask({ id: "t1", status: "pending" }),
    makeTask({ id: "t2", status: "completed" }),
    makeTask({ id: "t3", status: "pending" }),
  ];

  test("returns all tasks for 'all' filter", () => {
    expect(filterTasks(tasks, "all")).toHaveLength(3);
  });

  test("filters to pending only", () => {
    const result = filterTasks(tasks, "pending");
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.status === "pending")).toBe(true);
  });

  test("filters to completed only", () => {
    const result = filterTasks(tasks, "completed");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t2");
  });

  test("returns empty array when no tasks match", () => {
    expect(filterTasks(tasks, "completed").filter((t) => t.id === "none")).toEqual([]);
  });
});
