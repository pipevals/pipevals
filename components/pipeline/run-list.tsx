"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
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
  { label: string; className: string; icon: string }
> = {
  pending: {
    label: "Pending",
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
    icon: "○",
  },
  running: {
    label: "Running",
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: "◌",
  },
  completed: {
    label: "Completed",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: "✓",
  },
  failed: {
    label: "Failed",
    className:
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    icon: "✕",
  },
};

function RunStatusBadge({ status }: { status: RunStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none",
        config.className,
        status === "running" && "animate-pulse",
      )}
    >
      <span className="text-[9px]">{config.icon}</span>
      {config.label}
    </span>
  );
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to load runs");
    return res.json() as Promise<RunSummary[]>;
  });

async function triggerRun(url: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to trigger run");
  }
  return res.json() as Promise<{ runId: string }>;
}

export function RunList({ pipelineId }: { pipelineId: string }) {
  const apiUrl = `/api/pipelines/${pipelineId}/runs`;
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const { data: runs, error, isLoading, mutate } = useSWR(apiUrl, fetcher, {
    refreshInterval: (latestData) => {
      if (!latestData) return 0;
      const hasActive = latestData.some(
        (r) => r.status === "pending" || r.status === "running",
      );
      return hasActive ? 3000 : 0;
    },
    revalidateOnFocus: false,
  });

  const { trigger, isMutating } = useSWRMutation(apiUrl, triggerRun, {
    onSuccess: () => {
      setTriggerError(null);
      mutate();
    },
    onError: (err) => {
      setTriggerError(
        err instanceof Error ? err.message : "Failed to trigger run",
      );
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-xs text-muted-foreground">Loading runs…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-destructive/50 py-16">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load runs"}
        </p>
        <Button size="sm" variant="ghost" onClick={() => mutate()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/pipelines/${pipelineId}`}>← Editor</Link>
          </Button>
          <h1 className="text-sm font-medium text-foreground">Runs</h1>
        </div>
        <div className="flex items-center gap-2">
          {triggerError && (
            <p className="text-xs text-destructive">{triggerError}</p>
          )}
          <Button onClick={() => trigger()} disabled={isMutating}>
            {isMutating ? "Triggering…" : "Trigger Run"}
          </Button>
        </div>
      </div>

      {!runs || runs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">No runs yet</p>
          <p className="text-xs text-muted-foreground">
            Trigger a run to execute this pipeline
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/pipelines/${pipelineId}/runs/${run.id}`}
            >
              <Card
                size="sm"
                className="transition-colors hover:bg-muted/50"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RunStatusBadge status={run.status} />
                    <span className="font-mono text-xs text-muted-foreground">
                      {run.id.slice(0, 8)}
                    </span>
                  </CardTitle>
                  <CardAction>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {computeDuration(
                          run.startedAt,
                          run.completedAt,
                          run.status === "running",
                        )}
                      </span>
                      <span>{formatDateTime(run.createdAt)}</span>
                    </div>
                  </CardAction>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
