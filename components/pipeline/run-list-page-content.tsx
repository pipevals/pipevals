"use client";

import { useState } from "react";
import useSWRMutation from "swr/mutation";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { handleApiError } from "@/lib/handle-api-error";
import { RunList } from "./run-list";
import { TriggerWithPayloadDialog } from "./trigger-with-payload-dialog";
import { DatasetPickerDialog } from "./dataset-picker-dialog";

const EMPTY_SCHEMA: Record<string, unknown> = {};

function sampleFromSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> | null {
  const keys = Object.keys(schema);
  if (keys.length === 0) return null;
  return schema;
}

async function triggerRun(
  url: string,
  { arg }: { arg?: Record<string, unknown> } = {},
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...arg, source: "ui" }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to trigger run");
  }
  return res.json();
}

export function RunListPageContent({
  pipelineId,
}: {
  pipelineId: string;
}) {
  return (
    <main className="px-8 py-10">
      <RunList pipelineId={pipelineId} />
    </main>
  );
}

export function TriggerRunButton({
  pipelineId,
  triggerSchema = EMPTY_SCHEMA,
}: {
  pipelineId: string;
  triggerSchema?: Record<string, unknown>;
}) {
  const apiUrl = `/api/pipelines/${pipelineId}/runs`;
  const [payloadDialogOpen, setPayloadDialogOpen] = useState(false);
  const samplePayload = sampleFromSchema(triggerSchema);
  const hasRequiredFields = samplePayload !== null;

  const [datasetPickerOpen, setDatasetPickerOpen] = useState(false);

  const { trigger, isMutating } = useSWRMutation(apiUrl, triggerRun, {
    onSuccess: () => mutate(apiUrl),
    onError: (err) => handleApiError(err),
  });

  return (
    <>
      <DatasetPickerDialog
        open={datasetPickerOpen}
        onOpenChange={setDatasetPickerOpen}
        pipelineId={pipelineId}
        triggerSchema={triggerSchema}
      />
      <TriggerWithPayloadDialog
        open={payloadDialogOpen}
        onOpenChange={setPayloadDialogOpen}
        onTrigger={(payload) => trigger(payload)}
        defaultPayload={samplePayload ?? undefined}
        pipelineId={pipelineId}
      />
      <div className="flex rounded-md overflow-hidden">
        <Button
          size="sm"
          onClick={() =>
            hasRequiredFields ? setPayloadDialogOpen(true) : trigger()
          }
          disabled={isMutating}
          className="rounded-none border-0 ring-0"
        >
          {isMutating ? "Triggering…" : "Trigger Run"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="rounded-none border-0 border-l border-primary-foreground/20 px-2 ring-0"
              disabled={isMutating}
              aria-label="More trigger options"
            >
              <HugeiconsIcon icon={ArrowDown01Icon} size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                hasRequiredFields ? setPayloadDialogOpen(true) : trigger()
              }
              disabled={isMutating}
            >
              Trigger Run
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setPayloadDialogOpen(true);
              }}
            >
              Trigger with payload…
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setDatasetPickerOpen(true);
              }}
            >
              Run against dataset…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
