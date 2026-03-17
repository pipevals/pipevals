"use client";

import { useState } from "react";
import { usePipelineBuilderStore } from "@/lib/stores/pipeline-builder";
import type { TriggerSchemaField } from "@/lib/pipeline/types";

function FieldRow({
  field,
  onUpdate,
  onRemove,
}: {
  field: TriggerSchemaField;
  onUpdate: (updates: Partial<TriggerSchemaField>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-2">
      <div className="flex items-center gap-1">
        <input
          value={field.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="field_name"
          className="h-6 min-w-0 flex-1 rounded border border-border bg-background px-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={onRemove}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Remove ${field.name}`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
      </div>
      <input
        value={field.description ?? ""}
        onChange={(e) =>
          onUpdate({ description: e.target.value || undefined })
        }
        placeholder="Description (optional)"
        className="h-6 w-full rounded border border-border bg-background px-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

export function TriggerInputsPanel() {
  const triggerSchema = usePipelineBuilderStore((s) => s.triggerSchema);
  const addTriggerField = usePipelineBuilderStore((s) => s.addTriggerField);
  const removeTriggerField = usePipelineBuilderStore(
    (s) => s.removeTriggerField,
  );
  const updateTriggerField = usePipelineBuilderStore(
    (s) => s.updateTriggerField,
  );

  const [newName, setNewName] = useState("");

  function handleAdd() {
    const name = newName.trim();
    if (!name || triggerSchema.some((f) => f.name === name)) return;
    addTriggerField({ name });
    setNewName("");
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Trigger Inputs
        </h2>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto p-4">
        {triggerSchema.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Define the fields your pipeline expects to receive when triggered.
            Steps can reference them with{" "}
            <code className="rounded bg-muted px-1 font-mono">
              trigger.fieldName
            </code>
            .
          </p>
        )}

        {triggerSchema.map((field) => (
          <FieldRow
            key={field.name}
            field={field}
            onUpdate={(updates) => updateTriggerField(field.name, updates)}
            onRemove={() => removeTriggerField(field.name)}
          />
        ))}

        {/* Add field */}
        <div className="flex gap-1 pt-1">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="new_field"
            className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="rounded-md border border-border bg-background px-2 text-xs text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </aside>
  );
}
