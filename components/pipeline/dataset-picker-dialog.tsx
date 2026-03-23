"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import Link from "next/link";
import { handleApiError } from "@/lib/handle-api-error";
import type { PaginatedResponse } from "@/lib/api/pagination";

interface DatasetRow {
  id: string;
  name: string;
  description: string | null;
  schema: Record<string, string>;
  itemCount: number;
}

interface DatasetPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  triggerSchema: Record<string, unknown>;
}

export function DatasetPickerDialog({
  open,
  onOpenChange,
  pipelineId,
  triggerSchema,
}: DatasetPickerDialogProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: datasetsPage } = useSWR<PaginatedResponse<DatasetRow>>(
    open ? "/api/datasets" : null,
  );
  const allDatasets = datasetsPage?.data;

  // Filter to compatible datasets (exact key match)
  const pipelineKeys = Object.keys(triggerSchema).sort();
  const compatible = (allDatasets ?? []).filter((d) => {
    const datasetKeys = Object.keys(d.schema).sort();
    return (
      datasetKeys.length === pipelineKeys.length &&
      datasetKeys.every((k, i) => k === pipelineKeys[i])
    );
  });

  const onSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/eval-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to trigger eval run");
      }
      const { evalRunId } = await res.json();
      onOpenChange(false);
      router.push(`/pipelines/${pipelineId}/eval-runs/${evalRunId}`);
    } catch (e) {
      await handleApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Run Against Dataset</DialogTitle>
        </DialogHeader>

        {compatible.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyTitle>No compatible datasets</EmptyTitle>
              <EmptyDescription>
                No datasets match this pipeline&apos;s schema keys:{" "}
                <code className="font-mono text-xs">
                  {pipelineKeys.join(", ") || "(none)"}
                </code>
              </EmptyDescription>
            </EmptyHeader>
            <Button size="sm" variant="outline" asChild className="mt-4">
              <Link href="/datasets">Create a dataset</Link>
            </Button>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Select a dataset to evaluate this pipeline against all its items.
            </p>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {compatible.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelected(d.id)}
                  className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                    selected === d.id
                      ? "border-ring bg-muted/60 ring-1 ring-ring"
                      : "border-border bg-background hover:bg-muted/40"
                  }`}
                >
                  <span className="font-medium text-foreground">{d.name}</span>
                  <span className="block text-muted-foreground mt-0.5">
                    {d.itemCount} items
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onSubmit}
                disabled={!selected || submitting}
              >
                {submitting ? "Running..." : "Run"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
