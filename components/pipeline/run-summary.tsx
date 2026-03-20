"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { computeDuration, shortId } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  useRunViewerStore,
  isCancellableRunStatus,
  type RunStatus,
  type StepResultStatus,
} from "@/lib/stores/run-viewer";
import { getWorkflowRunUrl } from "@/lib/workflow-url";
import { WorkflowIcon } from "@/components/icons/workflow-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STATUS_DISPLAY: Record<
  RunStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
  },
  running: {
    label: "Running",
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  completed: {
    label: "Completed",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    className:
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  awaiting_review: {
    label: "Awaiting review",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

function Stat({
  label,
  value,
  title,
  className,
}: {
  label: string;
  value: string | number;
  title?: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={cn("text-sm font-semibold tabular-nums truncate max-w-[120px]", className)}
        title={title}
      >
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function CancelButton({ pipelineId, runId }: { pipelineId: string; runId: string }) {
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/runs/${runId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Failed to cancel run:", body.error ?? res.statusText);
      }
    } catch (err) {
      console.error("Failed to cancel run:", err);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs"
      onClick={handleCancel}
      disabled={cancelling}
    >
      {cancelling ? "Cancelling…" : "Cancel"}
    </Button>
  );
}

export function RunSummary() {
  const run = useRunViewerStore((s) => s.run);
  if (!run) return null;

  const isCancellable = isCancellableRunStatus(run.status);
  const statusDisplay = STATUS_DISPLAY[run.status];
  const isAwaitingReview = run.status === "awaiting_review";
  const duration = computeDuration(
    run.startedAt,
    run.completedAt,
    run.status === "running" || isAwaitingReview,
  );

  // Find the step label that is awaiting review
  const awaitingStepLabel = isAwaitingReview
    ? (() => {
        const sr = run.stepResults.find((s) => s.status === "awaiting_review");
        if (!sr) return null;
        const node = run.graphSnapshot.nodes.find((n) => n.id === sr.nodeId);
        return (node as { label?: string })?.label ?? null;
      })()
    : null;

  const workflowRunUrl = getWorkflowRunUrl(run.workflowRunId ?? null);

  const counts: Record<StepResultStatus, number> = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    awaiting_review: 0,
  };
  for (const sr of run.stepResults) {
    counts[sr.status]++;
  }
  const totalNodes = run.graphSnapshot.nodes.length;
  const noResult = totalNodes - run.stepResults.length;
  counts.pending += noResult;

  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/pipelines">Pipelines</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/pipelines/${run.pipelineId}/runs`}>
                {run.pipelineSlug ?? shortId(run.pipelineId)}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/pipelines/${run.pipelineId}/runs`}>Runs</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-mono">{shortId(run.id)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-4">
      <div
        className={cn(
          "rounded-full border px-2.5 py-1 text-xs font-medium",
          statusDisplay.className,
          run.status === "running" && "animate-pulse",
        )}
      >
        {statusDisplay.label}
      </div>

      {isCancellable && (
        <CancelButton pipelineId={run.pipelineId} runId={run.id} />
      )}

      {isAwaitingReview && (
        <Link
          href={`/pipelines/${run.pipelineId}/tasks`}
          className="flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-500/10 transition-colors dark:text-amber-400"
        >
          Waiting on: {awaitingStepLabel ?? "human review"}
          <span className="text-[10px]">&rarr;</span>
        </Link>
      )}

      <div className="h-6 w-px bg-border" />

      <Stat label="Duration" value={duration} />

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-4">
        <Stat
          label="Completed"
          value={counts.completed}
          className="text-emerald-600 dark:text-emerald-400"
        />
        {counts.failed > 0 && (
          <Stat
            label="Failed"
            value={counts.failed}
            className="text-red-600 dark:text-red-400"
          />
        )}
        {counts.skipped > 0 && (
          <Stat label="Skipped" value={counts.skipped} />
        )}
        {counts.running > 0 && (
          <Stat
            label="Running"
            value={counts.running}
            className="text-blue-600 dark:text-blue-400"
          />
        )}
        {counts.awaiting_review > 0 && (
          <Stat
            label="Reviewing"
            value={counts.awaiting_review}
            className="text-amber-600 dark:text-amber-400"
          />
        )}
        <Stat
          label="Total"
          value={totalNodes}
          className="text-foreground"
        />
      </div>

      {workflowRunUrl && (
        <>
          <div className="h-6 w-px bg-border" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={workflowRunUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <WorkflowIcon className="h-3.5 w-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent>Inspect in Workflow DevKit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}

      </div>
    </div>
  );
}
