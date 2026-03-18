"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function TriggerWithPayloadDialog({
  onTrigger,
}: {
  onTrigger: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState("{}");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isValid = error === null;

  function handleJsonChange(value: string) {
    setJson(value);
    try {
      JSON.parse(value);
      setError(null);
    } catch {
      setError("Invalid JSON");
    }
  }

  async function handleSubmit() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      return;
    }

    setSubmitting(true);
    try {
      await onTrigger(parsed);
      setOpen(false);
      setJson("{}");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger run");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Trigger with payload…
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trigger with payload</DialogTitle>
          <DialogDescription>
            Enter a JSON payload to pass to the pipeline run.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <textarea
            aria-label="JSON payload"
            className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={json}
            onChange={(e) => handleJsonChange(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? "Triggering…" : "Trigger"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
