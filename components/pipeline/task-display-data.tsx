"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function JsonViewer({ data }: { data: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const json = JSON.stringify(data, null, 2);
  const lines = json.split("\n");
  const preview = lines.length > 5 && !expanded;

  return (
    <div className="relative">
      <pre
        className={cn(
          "overflow-x-auto rounded border border-border bg-muted/50 p-3 font-mono text-xs text-foreground",
          preview && "max-h-[120px] overflow-hidden",
        )}
      >
        {preview ? lines.slice(0, 5).join("\n") + "\n..." : json}
      </pre>
      {lines.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
        >
          {expanded ? "Collapse" : `Show all (${lines.length} lines)`}
        </button>
      )}
    </div>
  );
}

function DisplayEntry({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {typeof value === "string" ? (
        <div className="whitespace-pre-wrap rounded border border-border bg-background p-4 text-sm leading-relaxed text-foreground">
          {value}
        </div>
      ) : (
        <JsonViewer data={value} />
      )}
    </div>
  );
}

export function TaskDisplayData({
  displayData,
}: {
  displayData: Record<string, unknown>;
}) {
  const entries = Object.entries(displayData);

  if (entries.length === 0) {
    return (
      <div className="p-6 text-xs text-muted-foreground">
        No display data configured for this review step.
      </div>
    );
  }

  // Side-by-side for exactly 2 entries
  if (entries.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0">
        {entries.map(([label, value]) => (
          <div key={label} className="border-b border-border p-6 first:border-r">
            <DisplayEntry label={label} value={value} />
          </div>
        ))}
      </div>
    );
  }

  // Stacked for 1 or 3+ entries
  return (
    <div className="flex flex-col gap-0">
      {entries.map(([label, value]) => (
        <div key={label} className="border-b border-border p-6">
          <DisplayEntry label={label} value={value} />
        </div>
      ))}
    </div>
  );
}
