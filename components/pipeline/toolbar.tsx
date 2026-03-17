"use client";

import Link from "next/link";
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
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
          {saving ? "Saving…" : "Deploy"}
        </Button>
      </div>
    </div>
  );
}
