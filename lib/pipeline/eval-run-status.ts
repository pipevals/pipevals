type RunStatus = { status: string };

interface DerivedStatus {
  status: "pending" | "running" | "completed" | "failed";
  completedItems: number;
  failedItems: number;
}

export function deriveEvalRunStatus(runs: RunStatus[]): DerivedStatus {
  if (runs.length === 0) {
    return { status: "pending", completedItems: 0, failedItems: 0 };
  }

  let completedItems = 0;
  let failedItems = 0;
  let hasRunning = false;
  let hasPending = false;

  for (const run of runs) {
    if (run.status === "completed") {
      completedItems++;
    } else if (run.status === "failed") {
      failedItems++;
    } else if (run.status === "running" || run.status === "awaiting_review") {
      hasRunning = true;
    } else {
      hasPending = true;
    }
  }

  let status: DerivedStatus["status"];
  if (hasRunning || hasPending) {
    status = hasPending && !hasRunning && completedItems === 0 && failedItems === 0
      ? "pending"
      : "running";
  } else if (failedItems > 0) {
    status = "failed";
  } else {
    status = "completed";
  }

  return { status, completedItems, failedItems };
}
