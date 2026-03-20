"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { RubricField } from "@/lib/pipeline/types";
import { useTaskReviewStore } from "@/lib/stores/task-review";
import { useOrgRoleStore, selectReadOnly } from "@/lib/stores/org-role";
import { TaskDisplayData } from "./task-display-data";
import { TaskScoringForm, TaskScoringReadonly } from "./task-scoring-form";

interface TaskDetail {
  id: string;
  pipelineId: string;
  runId: string;
  nodeId: string;
  status: "pending" | "completed";
  rubric: RubricField[];
  displayData: Record<string, unknown>;
  response: Record<string, unknown> | null;
  reviewerIndex: number;
  reviewedBy: string | null;
  createdAt: string;
  completedAt: string | null;
  reviewerName: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function isComplete(rubric: RubricField[], values: Record<string, unknown>): boolean {
  return rubric.every((field) => {
    const v = values[field.name];
    if (v === undefined || v === null) return false;
    if (field.type === "text" && typeof v === "string") return v.length > 0;
    if (field.type === "select" && v === "") return false;
    return true;
  });
}

export function TaskReviewPanel({
  onSubmitted,
}: {
  onSubmitted: () => void;
}) {
  const readOnly = useOrgRoleStore(selectReadOnly);
  const taskId = useTaskReviewStore((s) => s.selectedTaskId)!;
  const allTasks = useTaskReviewStore((s) => s.tasks);

  const { data: task, mutate } = useSWR<TaskDetail>(
    `/api/tasks/${taskId}`,
    fetcher,
  );

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<"success" | "error" | null>(null);

  const handleChange = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setSubmitResult(null);
  }, []);

  const rubric = task?.rubric ?? [];
  const canSubmit = isComplete(rubric, values) && !submitting && !readOnly;
  const isAlreadyCompleted = task?.status === "completed";

  // Sibling tasks: same run + node, different reviewer index, completed
  const siblingReviews = useMemo(() => {
    if (!task) return [];
    return allTasks.filter(
      (t) =>
        t.runId === task.runId &&
        t.nodeId === task.nodeId &&
        t.id !== task.id &&
        t.status === "completed",
    );
  }, [task, allTasks]);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        setSubmitResult("error");
        return;
      }

      setSubmitResult("success");
      setValues({});
      mutate();
      onSubmitted();
    } catch {
      setSubmitResult("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!task) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading task...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Display Data */}
      <TaskDisplayData displayData={task.displayData} />

      {/* Scoring Panel */}
      <div className="border-t border-border bg-background p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          {isAlreadyCompleted ? "Your Review (submitted)" : "Your Review"}
        </h3>

        {isAlreadyCompleted ? (
          <TaskScoringReadonly
            rubric={rubric}
            values={(task.response ?? {}) as Record<string, unknown>}
          />
        ) : (
          <>
            <TaskScoringForm
              rubric={rubric}
              values={values}
              onChange={handleChange}
            />

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  "rounded px-4 py-2 text-xs font-semibold transition-colors",
                  canSubmit
                    ? "bg-foreground text-background hover:opacity-90"
                    : "cursor-not-allowed bg-muted text-muted-foreground",
                )}
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </button>

              {submitResult === "success" && (
                <span className="text-xs font-medium text-emerald-600">
                  Review submitted!
                </span>
              )}
              {submitResult === "error" && (
                <span className="text-xs font-medium text-destructive">
                  Submission failed. Try again.
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Previously submitted sibling reviews */}
      {siblingReviews.length > 0 && (
        <div className="border-t border-border p-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Other Reviews
          </h3>
          <div className="flex flex-col gap-2">
            {siblingReviews.map((sibling) => (
              <div
                key={sibling.id}
                className="rounded border border-border bg-muted/30 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {sibling.reviewerName ?? "Reviewer"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTime(sibling.completedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
