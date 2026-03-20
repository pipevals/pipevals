"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Rocket01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePipelineBuilderStore } from "@/lib/stores/pipeline-builder";
import { useOrgRoleStore, selectReadOnly } from "@/lib/stores/org-role";
import { SaveAsTemplateDialog } from "./save-as-template-dialog";

export function PipelineToolbar() {
  const readOnly = useOrgRoleStore(selectReadOnly);
  const pipelineId = usePipelineBuilderStore((s) => s.pipelineId);
  const dirty = usePipelineBuilderStore((s) => s.dirty);
  const saving = usePipelineBuilderStore((s) => s.saving);
  const saveError = usePipelineBuilderStore((s) => s.saveError);
  const save = usePipelineBuilderStore((s) => s.save);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  return (
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

      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              size="sm"
              variant="outline"
              disabled={dirty || saving || readOnly}
              onClick={() => setTemplateDialogOpen(true)}
            >
              Save as Template
            </Button>
          </span>
        </TooltipTrigger>
        {dirty && (
          <TooltipContent>
            Deploy your changes before saving as a template
          </TooltipContent>
        )}
      </Tooltip>

      {pipelineId && (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/pipelines/${pipelineId}/runs`}>Test Run</Link>
        </Button>
      )}

      <Button
        size="sm"
        // Error is surfaced via saveError state — catch prevents unhandled rejection
        onClick={() => save().catch(() => {})}
        disabled={!dirty || saving || readOnly}
        className="gap-1.5"
      >
        <HugeiconsIcon icon={Rocket01Icon} size={12} aria-hidden />
        {saving ? "Saving…" : "Deploy"}
      </Button>

      <SaveAsTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
      />
    </div>
  );
}
