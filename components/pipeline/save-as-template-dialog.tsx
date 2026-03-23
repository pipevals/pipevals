"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePipelineBuilderStore } from "@/lib/stores/pipeline-builder";
import { slugify } from "@/lib/slugify";
import { handleApiError } from "@/lib/handle-api-error";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveAsTemplateDialog({ open, onOpenChange }: SaveAsTemplateDialogProps) {
  const pipelineName = usePipelineBuilderStore((s) => s.pipelineName);
  const nodes = usePipelineBuilderStore((s) => s.nodes);
  const edges = usePipelineBuilderStore((s) => s.edges);
  const triggerSchema = usePipelineBuilderStore((s) => s.triggerSchema);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pre-fill name from pipeline name when dialog opens
  useEffect(() => {
    if (open && pipelineName) {
      setName(pipelineName);
      setDescription("");
      setError(null);
    }
  }, [open, pipelineName]);

  const slug = name.trim() ? slugify(name) : "";

  const onSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    // Build graph snapshot from store
    const graphSnapshot = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.data.label,
        slug: n.data.slug,
        config: n.data.config,
        positionX: n.position.x,
        positionY: n.position.y,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        sourceNodeId: e.source,
        sourceHandle: e.sourceHandle ?? null,
        targetNodeId: e.target,
        targetHandle: e.targetHandle ?? null,
      })),
    };

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          graphSnapshot,
          triggerSchema,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save template");
        return;
      }

      onOpenChange(false);
    } catch (e) {
      setError("Failed to save template");
      await handleApiError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save the current pipeline as a reusable template for your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="template-name" className="text-xs font-medium text-foreground">
              Name
            </label>
            <input
              id="template-name"
              autoFocus
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSave()}
              placeholder="Template name"
              className="h-8 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {slug && (
              <p className="text-xs text-muted-foreground">
                Slug: {slug}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="template-description" className="text-xs font-medium text-foreground">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template does…"
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} disabled={!name.trim() || saving}>
            {saving ? "Saving…" : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
