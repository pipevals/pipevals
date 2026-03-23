"use client";

import Link from "next/link";
import useSWR from "swr";

import { formatDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusDot } from "./run-status";

interface RunItem {
  id: string;
  status: string;
  triggerPayload: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface EvalRunData {
  id: string;
  pipelineId: string;
  datasetId: string;
  status: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  createdAt: string;
  runs: RunItem[];
}

interface MetricRunEntry {
  id: string;
  status: string;
  metrics: Record<string, unknown>;
}

interface EvalRunMetrics {
  runs: MetricRunEntry[];
  aggregate: Record<string, number>;
}

export function EvalRunDetail({
  pipelineId,
  evalRunId,
}: {
  pipelineId: string;
  evalRunId: string;
}) {
  const isTerminal = (s: string) =>
    s === "completed" || s === "failed" || s === "cancelled";

  const { data: evalRun } = useSWR<EvalRunData>(
    `/api/pipelines/${pipelineId}/eval-runs/${evalRunId}`,
    { refreshInterval: (data) => (data && isTerminal(data.status) ? 0 : 3000) },
  );

  const { data: metrics } = useSWR<EvalRunMetrics>(
    `/api/pipelines/${pipelineId}/eval-runs/${evalRunId}/metrics`,
    { refreshInterval: () => {
      if (!evalRun) return 5000;
      return isTerminal(evalRun.status) ? 0 : 5000;
    } },
  );

  if (!evalRun) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground">
        Loading…
      </div>
    );
  }

  const progressPct =
    evalRun.totalItems > 0
      ? Math.round(
          ((evalRun.completedItems + evalRun.failedItems) /
            evalRun.totalItems) *
            100,
        )
      : 0;

  // Build per-run metrics map
  const runMetricsMap = new Map<string, Record<string, unknown>>();
  if (metrics) {
    for (const entry of metrics.runs) {
      runMetricsMap.set(entry.id, entry.metrics);
    }
  }

  // Determine metric keys from aggregate
  const metricKeys = metrics ? Object.keys(metrics.aggregate) : [];

  // Determine payload display keys from first run
  const payloadKeys =
    evalRun.runs.length > 0 && evalRun.runs[0].triggerPayload
      ? Object.keys(evalRun.runs[0].triggerPayload)
      : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <StatusDot status={evalRun.status} />
          <span className="text-xs text-muted-foreground">
            {evalRun.completedItems + evalRun.failedItems}/{evalRun.totalItems}{" "}
            items processed
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full max-w-md rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Aggregate metrics */}
      {metricKeys.length > 0 && metrics && (
        <div className="flex gap-4">
          {metricKeys.map((key) => (
            <div
              key={key}
              className="rounded-md border border-border px-4 py-3 min-w-[120px]"
            >
              <p className="text-xs text-muted-foreground">{key}</p>
              <p className="text-lg font-semibold text-foreground font-mono">
                {typeof metrics.aggregate[key] === "number"
                  ? metrics.aggregate[key].toFixed(2)
                  : "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Per-item results table */}
      <div className="border border-border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {payloadKeys.map((key) => (
                <TableHead key={key} className="text-xs">
                  {key}
                </TableHead>
              ))}
              <TableHead className="text-xs">Status</TableHead>
              {metricKeys.map((key) => (
                <TableHead key={key} className="text-xs">
                  {key}
                </TableHead>
              ))}
              <TableHead className="text-xs">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evalRun.runs.map((run) => {
              const runMetrics = runMetricsMap.get(run.id) ?? {};
              return (
                <TableRow key={run.id}>
                  {payloadKeys.map((key) => (
                    <TableCell
                      key={key}
                      className="text-xs max-w-xs truncate"
                    >
                      {String(run.triggerPayload?.[key] ?? "")}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Link
                      href={`/pipelines/${pipelineId}/runs/${run.id}`}
                      className="hover:underline"
                    >
                      <StatusDot status={run.status} />
                    </Link>
                  </TableCell>
                  {metricKeys.map((key) => (
                    <TableCell
                      key={key}
                      className="text-xs font-mono text-muted-foreground"
                    >
                      {typeof runMetrics[key] === "number"
                        ? (runMetrics[key] as number).toFixed(2)
                        : "—"}
                    </TableCell>
                  ))}
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(run.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
