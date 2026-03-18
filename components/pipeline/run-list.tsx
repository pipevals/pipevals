"use client";

import Link from "next/link";
import useSWR from "swr";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyContent,
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
import { Button } from "@/components/ui/button";
import { computeDuration, formatDateTime } from "@/lib/format";
import type { RunStatus } from "@/lib/stores/run-viewer";

interface RunSummary {
  id: string;
  status: RunStatus;
  triggerPayload: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<
  RunStatus,
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

function StatusDot({ status }: { status: RunStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn("inline-block h-1.5 w-1.5 rounded-full", config.dotClass)}
      />
      <span className={cn("text-xs", config.textClass)}>{config.label}</span>
    </span>
  );
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to load runs");
    return res.json() as Promise<RunSummary[]>;
  });

export function RunList({ pipelineId }: { pipelineId: string }) {
  const apiUrl = `/api/pipelines/${pipelineId}/runs`;

  const { data: runs, error, isLoading } = useSWR(apiUrl, fetcher, {
    refreshInterval: (latestData) => {
      if (!latestData) return 0;
      const hasActive = latestData.some(
        (r) => r.status === "pending" || r.status === "running",
      );
      return hasActive ? 3000 : 0;
    },
    revalidateOnFocus: false,
  });

  return (
    <div className="flex flex-col gap-8">
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <p className="text-xs text-muted-foreground">Loading runs…</p>
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
          {!runs || runs.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={PlayIcon} size={24} aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No runs yet</EmptyTitle>
                <EmptyDescription>
                  Trigger a run to execute this pipeline
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[25%] font-mono text-[11px] uppercase tracking-wider">
                    Run ID
                  </TableHead>
                  <TableHead className="w-[17%] font-mono text-[11px] uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-[25%] font-mono text-[11px] uppercase tracking-wider">
                    Trigger
                  </TableHead>
                  <TableHead className="w-[17%] font-mono text-[11px] uppercase tracking-wider text-right">
                    Duration
                  </TableHead>
                  <TableHead className="w-[16%] font-mono text-[11px] uppercase tracking-wider text-right">
                    Created
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow
                    key={run.id}
                    className="group relative cursor-pointer"
                  >
                    <TableCell className="font-mono text-xs text-foreground group-hover:text-primary transition-colors truncate">
                      <Link
                        href={`/pipelines/${pipelineId}/runs/${run.id}`}
                        className="absolute inset-0"
                        aria-label={`View run ${run.id.slice(0, 12)}`}
                      />
                      {run.id.slice(0, 12)}
                    </TableCell>
                    <TableCell>
                      <StatusDot status={run.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors">
                      {(run.triggerPayload as Record<string, string> | null)
                        ?.source ?? "api"}
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
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
