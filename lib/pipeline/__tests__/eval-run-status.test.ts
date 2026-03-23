import { describe, expect, test } from "bun:test";
import { deriveEvalRunStatus } from "@/lib/pipeline/eval-run-status";

describe("deriveEvalRunStatus", () => {
  test("returns pending for empty runs", () => {
    expect(deriveEvalRunStatus([])).toEqual({
      status: "pending",
      completedItems: 0,
      failedItems: 0,
    });
  });

  test("returns completed when all runs completed", () => {
    const runs = [{ status: "completed" }, { status: "completed" }];
    expect(deriveEvalRunStatus(runs)).toEqual({
      status: "completed",
      completedItems: 2,
      failedItems: 0,
    });
  });

  test("returns running when some runs are in progress", () => {
    const runs = [
      { status: "completed" },
      { status: "running" },
      { status: "pending" },
    ];
    expect(deriveEvalRunStatus(runs)).toEqual({
      status: "running",
      completedItems: 1,
      failedItems: 0,
    });
  });

  test("returns failed when all terminal and some failed", () => {
    const runs = [
      { status: "completed" },
      { status: "failed" },
    ];
    expect(deriveEvalRunStatus(runs)).toEqual({
      status: "failed",
      completedItems: 1,
      failedItems: 1,
    });
  });

  test("counts cancelled runs as failed", () => {
    const runs = [
      { status: "completed" },
      { status: "cancelled" },
    ];
    const result = deriveEvalRunStatus(runs);
    expect(result.failedItems).toBe(1);
    expect(result.completedItems).toBe(1);
    expect(result.status).toBe("failed");
  });

  test("fully cancelled eval run resolves to failed, not running", () => {
    const runs = [
      { status: "cancelled" },
      { status: "cancelled" },
    ];
    const result = deriveEvalRunStatus(runs);
    expect(result.status).toBe("failed");
    expect(result.failedItems).toBe(2);
  });

  test("awaiting_review counts as running", () => {
    const runs = [
      { status: "completed" },
      { status: "awaiting_review" },
    ];
    expect(deriveEvalRunStatus(runs).status).toBe("running");
  });

  test("pending only returns pending", () => {
    const runs = [{ status: "pending" }, { status: "pending" }];
    expect(deriveEvalRunStatus(runs).status).toBe("pending");
  });
});
