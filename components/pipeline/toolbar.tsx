"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Rocket01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePipelineBuilderStore } from "@/lib/stores/pipeline-builder";

export function PipelineToolbar() {
  const pipelineId = usePipelineBuilderStore((s) => s.pipelineId);
  const pipelineSlug = usePipelineBuilderStore((s) => s.pipelineSlug);
  const dirty = usePipelineBuilderStore((s) => s.dirty);
  const saving = usePipelineBuilderStore((s) => s.saving);
  const saveError = usePipelineBuilderStore((s) => s.saveError);
  const save = usePipelineBuilderStore((s) => s.save);

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-5">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/pipelines">Pipelines</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {pipelineId && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href={`/pipelines/${pipelineId}`}
                    className="max-w-[180px] truncate"
                  >
                    {pipelineSlug ?? pipelineId.slice(0, 8)}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>Builder</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Save status */}
        <div className="flex items-center gap-1.5 mr-2">
          {saving ? (
            <span className="text-xs text-muted-foreground">Saving…</span>
          ) : saveError ? (
            <span className="text-xs text-destructive" title={saveError}>Save failed</span>
          ) : !dirty ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-pass opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pass" />
              </span>
              <span className="text-xs text-muted-foreground">Saved</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
        </div>

        {pipelineId && (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/pipelines/${pipelineId}/runs`}>Test Run</Link>
          </Button>
        )}

        <Button
          size="sm"
          // Error is surfaced via saveError state — catch prevents unhandled rejection
          onClick={() => save().catch(() => {})}
          disabled={!dirty || saving}
          className="gap-1.5"
        >
          <HugeiconsIcon icon={Rocket01Icon} size={12} aria-hidden />
          {saving ? "Saving…" : "Deploy"}
        </Button>
      </div>
    </div>
  );
}
