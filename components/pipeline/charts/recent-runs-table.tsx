"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { shortId } from "@/lib/format";
import { StatusDot } from "../run-status";
import type { MetricRunEntry } from "../metrics-dashboard";

const MAX_ROWS = 10;

const MAX_STRING_LEN = 32;

function formatMetricValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  const str = String(value);
  return str.length > MAX_STRING_LEN ? `${str.slice(0, MAX_STRING_LEN)}…` : str;
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
      <Table className="table-fixed">
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
              {displayMetrics.map((name) => {
                const raw = run.metrics[name];
                return (
                  <TableCell
                    key={name}
                    className="max-w-40 truncate text-right font-mono text-xs text-muted-foreground"
                    title={raw != null ? String(raw) : undefined}
                  >
                    {formatMetricValue(raw)}
                  </TableCell>
                );
              })}
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
