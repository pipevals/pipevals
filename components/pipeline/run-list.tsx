"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
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
import { StatusDot } from "./run-status";

interface RunSummary {
  id: string;
  status: RunStatus;
  triggerPayload: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export function RunList({ pipelineId }: { pipelineId: string }) {
  const apiUrl = `/api/pipelines/${pipelineId}/runs`;

  const { data: runs, error, isLoading } = useSWR<RunSummary[]>(apiUrl, fetcher, {
    refreshInterval: (latestData) => {
      if (!latestData) return 0;
      const hasActive = latestData.some(
        (r) => !isTerminalRunStatus(r.status),
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
                        aria-label={`View run ${shortId(run.id)}`}
                      />
                      {shortId(run.id)}
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
