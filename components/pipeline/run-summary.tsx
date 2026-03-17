"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { computeDuration } from "@/lib/format";
import { extractMetrics } from "@/lib/pipeline/extract-metrics";
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
  type RunStatus,
  type StepResultStatus,
} from "@/lib/stores/run-viewer";

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
};

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn("text-sm font-semibold tabular-nums", className)}>
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

export function RunSummary() {
  const run = useRunViewerStore((s) => s.run);
  if (!run) return null;

  const statusDisplay = STATUS_DISPLAY[run.status];
  const duration = computeDuration(run.startedAt, run.completedAt, run.status === "running");

  const counts: Record<StepResultStatus, number> = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
  };
  for (const sr of run.stepResults) {
    counts[sr.status]++;
  }
  const totalNodes = run.graphSnapshot.nodes.length;
  const noResult = totalNodes - run.stepResults.length;
  counts.pending += noResult;

  const metrics = extractMetrics(run);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-background px-8 py-3">
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
                {run.pipelineSlug ?? run.pipelineId.slice(0, 8)}
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
            <BreadcrumbPage className="font-mono">{run.id.slice(0, 8)}</BreadcrumbPage>
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
        <Stat
          label="Total"
          value={totalNodes}
          className="text-foreground"
        />
      </div>

      {metrics.length > 0 && (
        <>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-4">
            {metrics.map((m) => (
              <Stat
                key={m.name}
                label={m.name}
                value={
                  typeof m.value === "number"
                    ? Number.isInteger(m.value)
                      ? m.value
                      : m.value.toFixed(4)
                    : String(m.value ?? "—")
                }
                className="text-foreground"
              />
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
