"use client";

import { useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";

import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon } from "@hugeicons/core-free-icons";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { computeDuration, formatDateTime, shortId } from "@/lib/format";
import { isTerminalRunStatus, type RunStatus } from "@/lib/stores/run-viewer";
import type { PaginatedResponse } from "@/lib/api/pagination";
import { StatusDot } from "./run-status";
import type { EvalRunSummary, DatasetInfo } from "@/lib/pipeline/types/shared";

interface RunSummary {
  id: string;
  status: RunStatus;
  triggerPayload: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

type TimelineEntry =
  | { type: "adhoc"; data: RunSummary }
  | { type: "eval"; data: EvalRunSummary; datasetName: string };

export function RunList({ pipelineId }: { pipelineId: string }) {
  const runsUrl = `/api/pipelines/${pipelineId}/runs`;
  const evalRunsUrl = `/api/pipelines/${pipelineId}/eval-runs`;

  const { data: runsPage, error: runsError, isLoading: runsLoading } = useSWR<PaginatedResponse<RunSummary>>(
    runsUrl,
    {
      refreshInterval: (latestData) => {
        if (!latestData) return 0;
        const hasActive = latestData.data.some((r) => !isTerminalRunStatus(r.status));
        return hasActive ? 3000 : 0;
      },
    },
  );
  const runs = runsPage?.data;

  const { data: evalRunsPage, error: evalError, isLoading: evalLoading } = useSWR<PaginatedResponse<EvalRunSummary>>(
    evalRunsUrl,
    {
      refreshInterval: (latestData) => {
        if (!latestData) return 0;
        const hasActive = latestData.data.some(
          (r) => r.status === "pending" || r.status === "running",
        );
        return hasActive ? 5000 : 0;
      },
    },
  );
  const evalRuns = evalRunsPage?.data;

  const { data: datasetsPage } = useSWR<PaginatedResponse<DatasetInfo>>("/api/datasets");
  const datasets = datasetsPage?.data;
  const datasetMap = useMemo(
    () => new Map((datasets ?? []).map((d) => [d.id, d.name])),
    [datasets],
  );

  const isLoading = runsLoading || evalLoading;
  const error = runsError || evalError;

  // Build unified timeline sorted by createdAt desc
  const timeline = useMemo(() => {
    const entries: TimelineEntry[] = [];
    if (runs) {
      for (const r of runs) {
        entries.push({ type: "adhoc", data: r });
      }
    }
    if (evalRuns) {
      for (const er of evalRuns) {
        entries.push({
          type: "eval",
          data: er,
          datasetName: datasetMap.get(er.datasetId) ?? shortId(er.datasetId),
        });
      }
    }
    entries.sort(
      (a, b) =>
        new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime(),
    );
    return entries;
  }, [runs, evalRuns, datasetMap]);

  return (
    <div className="flex flex-col gap-8">
      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load runs"}
          </p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {timeline.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={PlayIcon} size={24} aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No runs yet</EmptyTitle>
                <EmptyDescription>
                  Trigger a run or run against a dataset to get started
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[12%] font-mono text-[11px] uppercase tracking-wider">
                    Type
                  </TableHead>
                  <TableHead className="w-[30%] font-mono text-[11px] uppercase tracking-wider">
                    Source
                  </TableHead>
                  <TableHead className="w-[22%] font-mono text-[11px] uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-[17%] font-mono text-[11px] uppercase tracking-wider text-right">
                    Duration
                  </TableHead>
                  <TableHead className="w-[19%] font-mono text-[11px] uppercase tracking-wider text-right">
                    Created
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeline.map((entry) => {
                  if (entry.type === "eval") {
                    const er = entry.data;
                    return (
                      <TableRow
                        key={`eval-${er.id}`}
                        className="group relative cursor-pointer"
                      >
                        <TableCell>
                          <Link
                            href={`/pipelines/${pipelineId}/eval-runs/${er.id}`}
                            className="absolute inset-0"
                            aria-label={`View eval run ${entry.datasetName}`}
                          />
                          <span className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Dataset
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {entry.datasetName}
                          </span>
                          <span className="text-muted-foreground ml-1.5">
                            ({er.totalItems} items)
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusDot status={er.status} />
                            <span className="text-xs text-muted-foreground">
                              {er.completedItems}/{er.totalItems}
                              {er.failedItems > 0 && (
                                <span className="text-fail ml-1">
                                  ({er.failedItems} failed)
                                </span>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {formatDateTime(er.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  } else {
                    const run = entry.data;
                    return (
                      <TableRow
                        key={`run-${run.id}`}
                        className="group relative cursor-pointer"
                      >
                        <TableCell>
                          <Link
                            href={`/pipelines/${pipelineId}/runs/${run.id}`}
                            className="absolute inset-0"
                            aria-label={`View run ${shortId(run.id)}`}
                          />
                          <span className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Ad-hoc
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors">
                          {(run.triggerPayload as Record<string, string> | null)
                            ?.source ?? shortId(run.id)}
                        </TableCell>
                        <TableCell>
                          <StatusDot status={run.status} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {computeDuration(
                            run.startedAt,
                            run.completedAt,
                            run.status === "running",
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {formatDateTime(run.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  }
                })}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
