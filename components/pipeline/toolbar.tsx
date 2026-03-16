"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePipelineBuilderStore } from "@/lib/stores/pipeline-builder";

export function PipelineToolbar() {
  const pipelineId = usePipelineBuilderStore((s) => s.pipelineId);
  const dirty = usePipelineBuilderStore((s) => s.dirty);
  const saving = usePipelineBuilderStore((s) => s.saving);
  const save = usePipelineBuilderStore((s) => s.save);

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        {dirty && (
          <span className="text-[11px] text-muted-foreground">Unsaved changes</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {pipelineId && (
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/pipelines/${pipelineId}/runs`}>Runs</Link>
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => save().catch(() => {})}
          disabled={!dirty || saving}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
