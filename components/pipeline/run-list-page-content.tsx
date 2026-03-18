"use client";

import { useState } from "react";
import Link from "next/link";
import useSWRMutation from "swr/mutation";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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

/**
 * Generate a sample payload object from a JSON-Schema-style triggerSchema.
 * Returns null if the schema has no required properties.
 */
function sampleFromSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> | null {
  const required = schema.required as string[] | undefined;
  if (!required || required.length === 0) return null;

  const properties = (schema.properties ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const sample: Record<string, unknown> = {};
  for (const key of required) {
    const prop = properties[key];
    const type = prop?.type as string | undefined;
    if (type === "number" || type === "integer") sample[key] = 0;
    else if (type === "boolean") sample[key] = false;
    else if (type === "array") sample[key] = [];
    else if (type === "object") sample[key] = {};
    else sample[key] = "";
  }
  return sample;
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
  pipelineSlug,
  triggerSchema = {},
}: {
  pipelineId: string;
  pipelineSlug: string | null;
  triggerSchema?: Record<string, unknown>;
}) {
  const apiUrl = `/api/pipelines/${pipelineId}/runs`;
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [payloadDialogOpen, setPayloadDialogOpen] = useState(false);
  const samplePayload = sampleFromSchema(triggerSchema);
  const hasRequiredFields = samplePayload !== null;

  const { trigger, isMutating } = useSWRMutation(apiUrl, triggerRun, {
    onSuccess: () => {
      setTriggerError(null);
      mutate(apiUrl);
    },
    onError: (err) => {
      setTriggerError(
        err instanceof Error ? err.message : "Failed to trigger run",
      );
      handleApiError(err);
    },
  });

  return (
    <>
      <div className="border-b border-border bg-background">
        <div className="flex h-12 shrink-0 items-center justify-between px-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/pipelines">Pipelines</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href={`/pipelines/${pipelineId}`}
                    className="truncate max-w-[200px]"
                  >
                    {pipelineSlug ?? pipelineId.slice(0, 8)}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Runs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-3">
            {triggerError && (
              <p className="text-xs text-destructive">{triggerError}</p>
            )}
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
                  hasRequiredFields
                    ? setPayloadDialogOpen(true)
                    : trigger()
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
                      hasRequiredFields
                        ? setPayloadDialogOpen(true)
                        : trigger()
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      <main className="px-8 py-10">
        <RunList pipelineId={pipelineId} />
      </main>
    </>
  );
}
