"use client";

import { useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { shortId } from "@/lib/format";
import type { MetricRunEntry } from "../metrics-dashboard";

const MAX_ROWS = 10;

const STATUS_CONFIG: Record<
  string,
  { label: string; dotClass: string; textClass: string }
> = {
  pending: {
    label: "Pending",
    dotClass: "bg-muted-foreground/50",
    textClass: "text-muted-foreground",
  },
  running: {
    label: "Running",
    dotClass: "bg-running motion-safe:animate-pulse",
    textClass: "text-running",
  },
  completed: {
    label: "Completed",
    dotClass: "bg-pass",
    textClass: "text-pass",
  },
  failed: {
    label: "Failed",
    dotClass: "bg-fail",
    textClass: "text-fail",
  },
};

function StatusDot({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          config.dotClass,
        )}
      />
      <span className={cn("text-xs", config.textClass)}>{config.label}</span>
    </span>
  );
}

function formatMetricValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  return String(value);
}

interface Props {
  runs: MetricRunEntry[];
  metricNames: string[];
  pipelineId: string;
}

export function RecentRunsTable({ runs, metricNames, pipelineId }: Props) {
  // Show last N runs (runs are ordered ascending, so take from end)
  const recentRuns = useMemo(() => {
    return runs.slice(-MAX_ROWS).reverse();
  }, [runs]);

  // Show at most 4 metric columns to avoid overflow
  const displayMetrics = metricNames.slice(0, 4);

  if (recentRuns.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Recent Runs</h3>
        <Link
          href={`/pipelines/${pipelineId}/runs`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[15%] font-mono text-[11px] uppercase tracking-wider">
              Run ID
            </TableHead>
            <TableHead className="w-[12%] font-mono text-[11px] uppercase tracking-wider">
              Status
            </TableHead>
            {displayMetrics.map((name) => (
              <TableHead
                key={name}
                className="font-mono text-[11px] uppercase tracking-wider text-right"
              >
                {name}
              </TableHead>
            ))}
            <TableHead className="w-[12%] font-mono text-[11px] uppercase tracking-wider text-right">
              Duration
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentRuns.map((run) => (
            <TableRow key={run.id} className="group relative cursor-pointer">
              <TableCell className="font-mono text-xs text-foreground group-hover:text-primary transition-colors truncate">
                <Link
                  href={`/pipelines/${pipelineId}/runs/${run.id}`}
                  className="absolute inset-0"
                  aria-label={`View run ${shortId(run.id)}`}
                />
                {shortId(run.id)}
              </TableCell>
              <TableCell>
                <StatusDot status={run.status} />
              </TableCell>
              {displayMetrics.map((name) => (
                <TableCell
                  key={name}
                  className="text-right font-mono text-xs text-muted-foreground"
                >
                  {formatMetricValue(run.metrics[name])}
                </TableCell>
              ))}
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {run.durationMs != null
                  ? run.durationMs < 1000
                    ? `${run.durationMs}ms`
                    : `${(run.durationMs / 1000).toFixed(1)}s`
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
