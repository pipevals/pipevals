"use client";

import type { StepType } from "@/lib/pipeline/types";
import { cn } from "@/lib/utils";
import type { DragEvent } from "react";

interface PaletteEntry {
  type: StepType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

interface PaletteCategory {
  name: string;
  entries: PaletteEntry[];
}

const categories: PaletteCategory[] = [
  {
    name: "Execute",
    entries: [
      {
        type: "api_request",
        label: "API Request",
        icon: "A",
        color: "bg-blue-600",
        description: "Make an HTTP request",
      },
      {
        type: "ai_sdk",
        label: "AI SDK",
        icon: "AI",
        color: "bg-violet-600",
        description: "Call an LLM via AI SDK",
      },
      {
        type: "sandbox",
        label: "Sandbox",
        icon: "S",
        color: "bg-amber-600",
        description: "Execute code in a sandbox",
      },
    ],
  },
  {
    name: "Flow",
    entries: [
      {
        type: "condition",
        label: "Condition",
        icon: "?",
        color: "bg-emerald-600",
        description: "Branch based on a condition",
      },
      {
        type: "transform",
        label: "Transform",
        icon: "T",
        color: "bg-orange-600",
        description: "Map and reshape data",
      },
    ],
  },
  {
    name: "Measure",
    entries: [
      {
        type: "metric_capture",
        label: "Metric Capture",
        icon: "M",
        color: "bg-rose-600",
        description: "Extract a metric value",
      },
    ],
  },
  {
    name: "Review",
    entries: [
      {
        type: "human_review",
        label: "Human Review",
        icon: "H",
        color: "bg-cyan-600",
        description: "Collect human scores",
      },
    ],
  },
];

export const DRAG_TYPE_KEY = "application/pipevals-node-type";

function onDragStart(event: DragEvent, type: StepType) {
  event.dataTransfer.setData(DRAG_TYPE_KEY, type);
  event.dataTransfer.effectAllowed = "move";
}

export function NodePalette() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Step Types
        </h2>
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto p-2">
        {categories.map((category) => (
          <div key={category.name}>
            <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground first:pt-1">
              {category.name}
            </div>
            {category.entries.map((entry) => (
              <div
                key={entry.type}
                draggable
                onDragStart={(e) => onDragStart(e, entry.type)}
                className={cn(
                  "flex cursor-grab items-center gap-2.5 rounded-md border border-transparent px-3 py-2 transition-colors",
                  "hover:border-border hover:bg-muted/50 active:cursor-grabbing",
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white",
                    entry.color,
                  )}
                >
                  {entry.icon}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-foreground">
                    {entry.label}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {entry.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
