"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { formatDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon } from "@hugeicons/core-free-icons";
import { StatusDot } from "./run-status";

interface EvalRunSummary {
  id: string;
  pipelineId: string;
  datasetId: string;
  status: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  createdAt: string;
}

interface DatasetInfo {
  id: string;
  name: string;
}

export function EvalRunList({ pipelineId }: { pipelineId: string }) {
  const { data: evalRuns } = useSWR<EvalRunSummary[]>(
    `/api/pipelines/${pipelineId}/eval-runs`,
    fetcher,
    { refreshInterval: 5000 },
  );

  const { data: datasets } = useSWR<DatasetInfo[]>(
    "/api/datasets",
    fetcher,
  );

  const datasetMap = new Map(
    (datasets ?? []).map((d) => [d.id, d.name]),
  );

  if (!evalRuns) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (evalRuns.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={PlayIcon} size={24} aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No eval runs yet</EmptyTitle>
          <EmptyDescription>
            Run a pipeline against a dataset to see results here
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="border border-border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Dataset</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Progress</TableHead>
            <TableHead className="text-xs">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {evalRuns.map((er) => (
            <TableRow key={er.id}>
              <TableCell className="text-xs">
                <Link
                  href={`/pipelines/${pipelineId}/eval-runs/${er.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {datasetMap.get(er.datasetId) ?? er.datasetId.slice(0, 8)}
                </Link>
              </TableCell>
              <TableCell>
                <StatusDot status={er.status} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {er.completedItems}/{er.totalItems}
                {er.failedItems > 0 && (
                  <span className="text-fail ml-1">
                    ({er.failedItems} failed)
                  </span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDateTime(er.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
