"use client";

import { cn } from "@/lib/utils";
import type { RubricField } from "@/lib/pipeline/types";

function RatingInput({
  field,
  value,
  onChange,
}: {
  field: Extract<RubricField, { type: "rating" }>;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const count = field.max - field.min + 1;
  const scores = Array.from({ length: count }, (_, i) => field.min + i);
  const pct = value != null ? ((value - field.min) / (field.max - field.min)) * 100 : 0;

  return (
    <div className="rounded border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">
          {field.label ?? field.name}
        </span>
        {value != null && (
          <span className="font-mono text-xs font-semibold text-foreground">
            {value}/{field.max}
          </span>
        )}
      </div>
      <div className="mb-2 flex gap-1">
        {scores.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition-colors",
              value === s
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:border-foreground hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BooleanInput({
  field,
  value,
  onChange,
}: {
  field: Extract<RubricField, { type: "boolean" }>;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="rounded border border-border bg-background p-3">
      <span className="mb-2 block text-xs font-medium text-foreground">
        {field.label}
      </span>
      <div className="flex gap-2">
        {[true, false].map((opt) => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors",
              value === opt
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:border-foreground hover:text-foreground",
            )}
          >
            {opt ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextInput({
  field,
  value,
  onChange,
}: {
  field: Extract<RubricField, { type: "text" }>;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded border border-border bg-background p-3">
      <span className="mb-2 block text-xs font-medium text-foreground">
        {field.label ?? field.name}
      </span>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? "Enter your response..."}
        rows={3}
        className="w-full rounded border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

function SelectInput({
  field,
  value,
  onChange,
}: {
  field: Extract<RubricField, { type: "select" }>;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded border border-border bg-background p-3">
      <span className="mb-2 block text-xs font-medium text-foreground">
        {field.label ?? field.name}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border bg-muted/30 px-2 py-1.5 text-xs text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="" disabled>
          Select...
        </option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TaskScoringForm({
  rubric,
  values,
  onChange,
  disabled,
}: {
  rubric: RubricField[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  disabled?: boolean;
}) {
  if (rubric.length === 0) {
    return (
      <div className="p-6 text-xs text-muted-foreground">
        No rubric fields configured.
      </div>
    );
  }

  // Use a grid for rating fields, stacked for others
  const ratingFields = rubric.filter((f) => f.type === "rating");
  const otherFields = rubric.filter((f) => f.type !== "rating");

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-3">
      {ratingFields.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {ratingFields.map((field) => (
            <RatingInput
              key={field.name}
              field={field as Extract<RubricField, { type: "rating" }>}
              value={values[field.name] as number | undefined}
              onChange={(v) => onChange(field.name, v)}
            />
          ))}
        </div>
      )}
      {otherFields.map((field) => {
        switch (field.type) {
          case "boolean":
            return (
              <BooleanInput
                key={field.name}
                field={field}
                value={values[field.name] as boolean | undefined}
                onChange={(v) => onChange(field.name, v)}
              />
            );
          case "text":
            return (
              <TextInput
                key={field.name}
                field={field}
                value={values[field.name] as string | undefined}
                onChange={(v) => onChange(field.name, v)}
              />
            );
          case "select":
            return (
              <SelectInput
                key={field.name}
                field={field}
                value={values[field.name] as string | undefined}
                onChange={(v) => onChange(field.name, v)}
              />
            );
          default:
            return null;
        }
      })}
    </fieldset>
  );
}
