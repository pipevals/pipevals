"use client";

import { cn } from "@/lib/utils";
import type { StepResultStatus } from "@/lib/stores/run-viewer";

const statusConfig: Record<
  StepResultStatus,
  { label: string; className: string; icon: string }
> = {
  pending: {
    label: "Pending",
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
    icon: "○",
  },
  running: {
    label: "Running",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: "◌",
  },
  completed: {
    label: "Completed",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: "✓",
  },
  failed: {
    label: "Failed",
    className: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    icon: "✕",
  },
  skipped: {
    label: "Skipped",
    className: "border-muted-foreground/20 bg-muted/50 text-muted-foreground/60",
    icon: "—",
  },
};

export function StatusBadge({ status }: { status: StepResultStatus }) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
        config.className,
        status === "running" && "animate-pulse",
      )}
    >
      <span className="text-[9px]">{config.icon}</span>
      {config.label}
    </div>
  );
}
