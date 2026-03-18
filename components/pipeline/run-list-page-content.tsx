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
}: {
  pipelineId: string;
  pipelineSlug: string | null;
}) {
  const apiUrl = `/api/pipelines/${pipelineId}/runs`;
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [payloadDialogOpen, setPayloadDialogOpen] = useState(false);

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
            />
            <div className="flex rounded-md overflow-hidden">
              <Button
                size="sm"
                onClick={() => trigger()}
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
                    onClick={() => trigger()}
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
