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
import { handleApiError } from "@/lib/handle-api-error";
import { RunList } from "./run-list";
import { TriggerWithPayloadDialog } from "./trigger-with-payload-dialog";

async function triggerRun(url: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: "ui" }),
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
        <div className="px-8 py-3 flex items-center justify-between">
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
              pipelineId={pipelineId}
              onSuccess={() => {
                setTriggerError(null);
                mutate(apiUrl);
              }}
            />
            <Button size="sm" onClick={() => trigger()} disabled={isMutating}>
              {isMutating ? "Triggering…" : "Trigger Run"}
            </Button>
          </div>
        </div>
      </div>
      <main className="px-8 py-10">
        <RunList pipelineId={pipelineId} />
      </main>
    </>
  );
}
